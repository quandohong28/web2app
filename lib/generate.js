const path = require('path');
const fs = require('fs-extra');

const TEMPLATE_DIR = path.join(__dirname, '..', 'template');

// Mapping macOS -> phiên bản Electron tương thích cao nhất.
// Nguồn: Electron breaking-changes docs (electronjs.org/docs/latest/breaking-changes)
// - Electron 33+ cần Big Sur trở lên (Catalina bị Chromium bỏ hỗ trợ)
// - Electron 38+ cần Monterey trở lên (Big Sur bị bỏ)
// - Electron 44+ cần Ventura trở lên (Monterey bị bỏ)
// Ventura/Sonoma/Sequoia/Tahoe hiện dùng chung bản Electron mới nhất (44.x, tính tới 09/2026).
const MACOS_TARGETS = [
	{ key: 'catalina', label: 'macOS 10.15 Catalina (2019)', minOS: '10.15.0', electronRange: '^32.0.0' },
	{ key: 'bigsur', label: 'macOS 11 Big Sur (2020)', minOS: '11.0.0', electronRange: '^37.0.0' },
	{ key: 'monterey', label: 'macOS 12 Monterey (2021)', minOS: '12.0.0', electronRange: '^43.0.0' },
	{ key: 'ventura', label: 'macOS 13 Ventura (2022)', minOS: '13.0.0', electronRange: '^44.0.0' },
	{ key: 'sonoma', label: 'macOS 14 Sonoma (2023)', minOS: '14.0.0', electronRange: '^44.0.0' },
	{ key: 'sequoia', label: 'macOS 15 Sequoia (2024)', minOS: '15.0.0', electronRange: '^44.0.0' },
	{ key: 'tahoe', label: 'macOS 26 Tahoe (2025, chỉ Apple Silicon)', minOS: '26.0.0', electronRange: '^44.0.0' },
];

function findMacosTarget(key) {
	return MACOS_TARGETS.find((t) => t.key === key) || MACOS_TARGETS[0];
}

function slugify(str) {
	return (
		String(str || '')
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)+/g, '') || 'my-app'
	);
}

function bundleIdFromTitle(title) {
	const slug = slugify(title).replace(/-/g, '');
	return `com.web2app.${slug || 'app'}`;
}

/**
 * answers: {
 *   title, url, appId, iconPath, hideMenuBar,
 *   windowMode ('fullscreen' | 'custom'), width, height,
 *   permissions[], macosTarget (key trong MACOS_TARGETS), outDir
 * }
 * Trả về đường dẫn tuyệt đối tới project vừa sinh.
 */
async function generateProject(answers, cwd = process.cwd()) {
	if (!answers.title || !answers.title.trim()) throw new Error('title là bắt buộc');
	if (!/^https?:\/\//.test(answers.url || '')) throw new Error('url phải bắt đầu bằng http(s)://');

	const target = findMacosTarget(answers.macosTarget);

	const outDir = path.resolve(cwd, answers.outDir || `./output/${slugify(answers.title)}`);
	await fs.ensureDir(outDir);

	await fs.copy(path.join(TEMPLATE_DIR, 'index.js'), path.join(outDir, 'index.js'));
	await fs.ensureDir(path.join(outDir, 'assets'));

	let iconRelPath = null;
	const rawIconPath = (answers.iconPath || '').trim().replace(/^['"]|['"]$/g, '');
	if (rawIconPath) {
		if (await fs.pathExists(rawIconPath)) {
			const ext = path.extname(rawIconPath).toLowerCase();
			const dest = path.join(outDir, 'assets', `icon${ext}`);
			await fs.copy(rawIconPath, dest);
			iconRelPath = `assets/icon${ext}`;
			if (ext === '.png') {
				await fs.copy(rawIconPath, path.join(outDir, 'assets', 'icon.png'));
			}
		} else {
			console.warn(`⚠ Không tìm thấy file icon tại: ${rawIconPath} — dùng icon mặc định.`);
		}
	}

	const fullscreen = answers.windowMode === 'fullscreen';
	const config = {
		title: answers.title,
		url: answers.url,
		fullscreen,
		width: fullscreen ? undefined : parseInt(answers.width, 10) || 1200,
		height: fullscreen ? undefined : parseInt(answers.height, 10) || 800,
		hideMenuBar: !!answers.hideMenuBar,
		permissions: answers.permissions || [],
	};
	await fs.writeJson(path.join(outDir, 'app.config.json'), config, { spaces: 2 });

	const pkg = {
		name: slugify(answers.title),
		productName: answers.title,
		version: '1.0.0',
		description: `Native wrapper cho ${answers.url}`,
		main: 'index.js',
		scripts: {
			start: 'electron .',
			build: 'electron-builder',
		},
		build: {
			appId: answers.appId || bundleIdFromTitle(answers.title),
			productName: answers.title,
			mac: {
				category: 'public.app-category.productivity',
				target: ['dmg'],
				minimumSystemVersion: target.minOS,
				...(iconRelPath ? { icon: iconRelPath } : {}),
			},
			files: ['index.js', 'app.config.json', 'assets/**/*', 'package.json'],
		},
		devDependencies: {
			electron: target.electronRange,
			'electron-builder': '^23.6.0',
		},
	};
	await fs.writeJson(path.join(outDir, 'package.json'), pkg, { spaces: 2 });

	const readme = `# ${answers.title}

App native macOS wrap từ: ${answers.url}

## Chạy thử (dev)
\`\`\`
yarn install
yarn start
\`\`\`

## Build ra file .dmg (chạy trên máy macOS)
\`\`\`
yarn install
yarn build
\`\`\`
File .dmg sẽ nằm trong thư mục \`dist/\`.

Yêu cầu macOS tối thiểu: ${target.minOS} (${target.label})
Electron: ${target.electronRange}
`;
	await fs.writeFile(path.join(outDir, 'README.md'), readme);

	return outDir;
}

module.exports = { generateProject, slugify, bundleIdFromTitle, MACOS_TARGETS, findMacosTarget };
