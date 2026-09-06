# web2app

CLI để wrap bất kỳ website nào thành app macOS native (giống cách bạn đã làm với
`fb-messenger-catalina`), nhưng generic — không cần sửa code tay mỗi lần muốn
đóng gói một trang mới.

Hỗ trợ macOS cũ (mặc định min `10.15.0` — Catalina), dùng Electron vì đó là
cách nhẹ/nhanh nhất để hỗ trợ macOS đời cũ mà không phải tự viết native
Cocoa app. (Xem phần "Vì sao Electron" bên dưới nếu bạn muốn nhẹ hơn nữa.)

## Cài đặt

```bash
git clone <repo-này>
cd web2app
yarn install
```

(Chưa có yarn thì cài trước: `npm install -g yarn` hoặc `brew install yarn`)

## Dùng

```bash
node bin/cli.js
```

CLI sẽ hỏi lần lượt:

- **App title** — tên hiển thị của app
- **URL** — link website muốn wrap
- **Bundle ID** — tự gợi ý từ tên app, sửa được
- **Icon** — đường dẫn tới file `.icns` (khuyên dùng, để có icon Dock/Finder
  đẹp) hoặc `.png`. Bỏ trống nếu chưa có, dùng icon Electron mặc định
- **Kích thước cửa sổ** — chọn 1 trong 2:
  - *Toàn màn hình (fullscreen)* — app mở full màn hình luôn, không cần nhập
    width/height
  - *Tùy chỉnh* — nhập chiều rộng/cao cụ thể
- **Ẩn menu bar** — có/không
- **Quyền truy cập** (multi-select): Camera & Micro, Notifications,
  Geolocation, Clipboard, Screen sharing
- **macOS tối thiểu hỗ trợ** — chọn từ danh sách có sẵn (Catalina → Tahoe).
  **Bản Electron được tự động chọn theo macOS này**, không cần tự nhập:

  | macOS | Electron |
  |---|---|
  | 10.15 Catalina | `^32.0.0` |
  | 11 Big Sur | `^37.0.0` |
  | 12 Monterey | `^43.0.0` |
  | 13 Ventura | `^44.0.0` |
  | 14 Sonoma | `^44.0.0` |
  | 15 Sequoia | `^44.0.0` |
  | 26 Tahoe (chỉ Apple Silicon) | `^44.0.0` |

  Mapping này dựa theo breaking-changes chính thức của Electron (Electron
  33+ bỏ Catalina, 38+ bỏ Big Sur, 44+ bỏ Monterey). Muốn hỗ trợ macOS còn
  cũ hơn Catalina (Mojave/High Sierra) thì sửa tay `MACOS_TARGETS` trong
  `lib/generate.js` — nhưng không khuyến khích vì Electron rất cũ có thể
  không render tốt web hiện đại.
- **Thư mục xuất project**
- **Build luôn hay không** — nếu chọn "có", CLI sẽ tự chạy `yarn install` +
  `yarn build` (cần chạy trên máy macOS có Xcode Command Line Tools, và đã
  cài yarn)

Sau khi chạy xong, project mới được sinh ra trong `output/<ten-app>/` với:

```
index.js          # main process Electron, đọc config, xử lý permission
app.config.json   # config runtime: title, url, size, permissions...
package.json      # script build (electron-builder), target dmg
assets/           # icon nếu bạn cung cấp
README.md
```

## Build ra .dmg

```bash
cd output/<ten-app>
yarn install
yarn build
```

File `.dmg` nằm trong `dist/`.

## Chạy nhiều lần cho nhiều website

Mỗi lần chạy `node bin/cli.js` sẽ tạo một project độc lập trong
`output/<ten-app-slug>/` — không đụng vào các app đã tạo trước đó. Muốn build
hàng loạt, có thể viết thêm 1 file JSON danh sách site rồi loop gọi
`generateProject()` (xem `bin/cli.js`) — dễ mở rộng vì phần sinh project đã
tách riêng khỏi phần hỏi input.

## Vì sao Electron (và khi nào nên đổi)

- Electron: nặng hơn (mỗi app ~100-150MB vì đóng gói cả Chromium+Node), nhưng
  **ổn định nhất cho macOS cũ** — bạn kiểm soát được chính xác phiên bản
  Chromium đi kèm, không phụ thuộc WebKit hệ thống (macOS 10.15 có WebKit khá
  cũ, nhiều web hiện đại chạy lỗi nếu dùng WebView hệ thống qua Tauri/wry).
- Nếu bạn không cần chạy trên macOS < 11 và muốn app nhẹ hơn nhiều
  (~5-10MB), có thể cân nhắc **Tauri** (Rust + WKWebView hệ thống) — nhưng vì
  bạn đang target Catalina, WebKit hệ thống cũ có thể khiến vài site JS/CSS
  hiện đại render lỗi, nên Electron là lựa chọn an toàn hơn ở đây.
- Một lựa chọn khác nếu chỉ cần nhanh, không cần build tool riêng: CLI có sẵn
  [`nativefier`](https://github.com/nativefier/nativefier) làm gần như đúng
  việc này (`nativefier "https://..." --name "App" --platform mac`). Tool
  trong repo này về cơ bản là một bản tối giản, tự viết, dựa trên chính
  project `fb-messenger-catalina` của bạn, để bạn kiểm soát toàn bộ code.
