#!/usr/bin/env node
const path = require('path');
const { execSync } = require('child_process');
const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { generateProject, slugify, bundleIdFromTitle, MACOS_TARGETS } = require('../lib/generate');

const PERMISSION_CHOICES = [
  { name: 'Camera & Micro (video call, ghi âm)', value: 'media' },
  { name: 'Thông báo (Notifications)', value: 'notifications' },
  { name: 'Vị trí (Geolocation)', value: 'geolocation' },
  { name: 'Clipboard (đọc clipboard)', value: 'clipboard-read' },
  { name: 'Chia sẻ màn hình (Screen sharing)', value: 'display-capture' },
];

function isYarnAvailable() {
  try {
    execSync('yarn --version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

async function promptAnswers(defaults) {
  const questions = [
    { type: 'input', name: 'title', message: 'Tên app (App title):', default: defaults.title, validate: (v) => (v.trim() ? true : 'Không được để trống') },
    { type: 'input', name: 'url', message: 'URL website muốn wrap:', default: defaults.url, validate: (v) => (/^https?:\/\//.test(v) ? true : 'URL phải bắt đầu bằng http:// hoặc https://') },
    { type: 'input', name: 'appId', message: 'Bundle ID (vd com.company.app):', default: (ans) => bundleIdFromTitle(ans.title) },
    { type: 'input', name: 'iconPath', message: 'Đường dẫn file icon .icns/.png (Enter để dùng icon mặc định):', default: '' },
    {
      type: 'list',
      name: 'windowMode',
      message: 'Kích thước cửa sổ:',
      choices: [
        { name: 'Toàn màn hình (fullscreen)', value: 'fullscreen' },
        { name: 'Tùy chỉnh (tự nhập chiều rộng/cao)', value: 'custom' },
      ],
    },
    { type: 'input', name: 'width', message: 'Chiều rộng cửa sổ:', default: '1200', when: (ans) => ans.windowMode === 'custom' },
    { type: 'input', name: 'height', message: 'Chiều cao cửa sổ:', default: '800', when: (ans) => ans.windowMode === 'custom' },
    { type: 'confirm', name: 'hideMenuBar', message: 'Ẩn thanh menu bar mặc định của Electron?', default: false },
    { type: 'checkbox', name: 'permissions', message: 'Chọn các quyền được phép truy cập:', choices: PERMISSION_CHOICES },
    {
      type: 'list',
      name: 'macosTarget',
      message: 'macOS tối thiểu hỗ trợ (bản Electron sẽ tự chọn theo macOS này):',
      choices: MACOS_TARGETS.map((t) => ({ name: `${t.label} — Electron ${t.electronRange}`, value: t.key })),
      default: 'catalina',
    },
    { type: 'input', name: 'outDir', message: 'Thư mục xuất project:', default: (ans) => `./output/${slugify(ans.title)}` },
    { type: 'confirm', name: 'runBuild', message: 'Chạy yarn install + build ngay bây giờ? (cần đang ở máy macOS)', default: false },
  ];
  return inquirer.prompt(questions);
}

function runBuildSteps(outDir) {
  if (!isYarnAvailable()) {
    throw new Error('Không tìm thấy yarn. Cài trước bằng: npm install -g yarn  (hoặc: brew install yarn)');
  }
  console.log(chalk.cyan(`\n→ yarn install (trong ${outDir}) ...`));
  execSync('yarn install', { cwd: outDir, stdio: 'inherit' });
  console.log(chalk.cyan('\n→ yarn build ...'));
  execSync('yarn build', { cwd: outDir, stdio: 'inherit' });
}

async function main() {
  const program = new Command();
  program
    .name('web2app')
    .description('Wrap bất kỳ website nào thành app macOS native (Electron)')
    .option('--title <title>', 'Tên app')
    .option('--url <url>', 'URL website')
    .parse(process.argv);

  const opts = program.opts();
  console.log(chalk.bold.green('=== web2app — Website to native macOS app ===\n'));

  const answers = await promptAnswers({ title: opts.title || '', url: opts.url || '' });
  const outDir = await generateProject(answers);

  console.log(chalk.green(`\n✔ Project đã được tạo tại: ${outDir}`));

  if (answers.runBuild) {
    try {
      runBuildSteps(outDir);
      console.log(chalk.bold.green(`\n✔ Build xong! Xem file .dmg trong ${path.join(outDir, 'dist')}`));
    } catch (err) {
      console.error(chalk.red('\n✘ Build thất bại:'), err.message);
      console.log(chalk.yellow(`Bạn có thể tự chạy: cd ${outDir} && yarn install && yarn build`));
    }
  } else {
    console.log(chalk.yellow(`\nĐể build app, chạy:\n  cd ${outDir}\n  yarn install\n  yarn build`));
  }
}

main().catch((err) => {
  console.error(chalk.red('Lỗi:'), err);
  process.exit(1);
});
