/**
 * The command the mod answers, and the fixed texts it prints.
 *
 * The name is namespaced by the plugin (`shunt` + `commands/usage.md`), which
 * is what keeps it off the built-in `/usage`: `$.command.register` takes a
 * bare global name and refuses `usage` outright ("it is the built-in /usage"),
 * while a plugin's markdown command lists as `shunt:usage` and is free.
 */
export const COMMAND_NAME = 'shunt:usage'

/**
 * The path `[server.usage]` registers on the gateway.
 */
export const USAGE_PATH = '/usage'

export const NO_BASE_URL_TEXT =
  '沒有可查詢的閘道器 —— SHUNT_BASE_URL 和 ANTHROPIC_BASE_URL 都未 ' +
  '設定，因此本會話正在直連 Anthropic。請將 Claude Code 指向 ' +
  '你的閘道器（export ANTHROPIC_BASE_URL=http://127.0.0.1:3001），然後重新執行 ' +
  '/shunt:usage。'

export const NO_TOKEN_TEXT =
  '沒有可用於認證的憑據 —— SHUNT_TOKEN、' +
  'ANTHROPIC_AUTH_TOKEN 和 ANTHROPIC_API_KEY 均未設定，也沒有 shunt ' +
  'gateway token apiKeyHelper 可用於讀取閘道器登入憑憑。請使用 ' +
  'shunt gateway login 登入，或向閘道器管理員索取客戶端 token。'

export const NOT_ENABLED_TEXT =
  '閘道器有應答，但未在其上啟用 GET /usage。請在閘道器配置中新增 ' +
  '[server.usage] 表並重啟；該表無需任何鍵，但同時需要設定 ' +
  '[server.auth]（客戶端 token）或 [server.gateway]（閘道器登入）。'

export const REFUSED_TEXT =
  '閘道器拒絕了本會話使用的憑據。SHUNT_TOKEN、ANTHROPIC_AUTH_TOKEN、' +
  'ANTHROPIC_API_KEY 以及 shunt gateway token helper 中 ' +
  '第一個已設定的會被髮送，其餘均被忽略。客戶端 token 必須是閘道器的 ' +
  '[server.auth] 接受的 token；閘道器登入可能已過期或被吊銷，請用 ' +
  'shunt gateway login 重新登入。'

export const HOOK_FAILED_TEXT =
  '無法讀取池用量 —— 回答此命令的鉤子 ' +
  '失敗或超出了時間預算。請重新執行 /shunt:usage；如果仍然 ' +
  '失敗，請檢查閘道器是否已啟動且可訪問。'

export const NO_POOL_TEXT =
  '閘道器未報告任何池化提供方，因此沒有可顯示的共享配額。' +
  '當某個提供方配置了池化賬戶 ' +
  '（認證模式為 oauth 或 chatgpt）後，就會顯示池用量。'
