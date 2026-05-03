# AgentGuard Protocol PRD

版本：v0.1  
日期：2026-05-03  
阶段：Solana Frontier Hackathon MVP  
状态：Approved for implementation  
关联文档：[MVP.md](./MVP.md)、[ARCHITECTURE.md](./ARCHITECTURE.md)、[FEASIBILITY_REPORT.md](./FEASIBILITY_REPORT.md)、[MULTI_ROLE_DECISION_REVIEW.md](./MULTI_ROLE_DECISION_REVIEW.md)

## 1. 产品概述

### 1.1 产品名称

AgentGuard Protocol

### 1.2 Tagline

Programmable spending limits for autonomous agents on Solana.

### 1.3 产品定位

AgentGuard Protocol 是一个 Solana 原生的 agent spending firewall。它允许 owner 为 AI agent 创建一个受策略约束的链上 vault，设置 merchant allowlist、单笔限额、日限额和暂停状态。agent 可以在这些规则内通过 x402-style paid API flow 自动付款，program 在资金转出前执行链上策略检查，并为成功付款生成 receipt PDA。

### 1.4 PRD 目标

本 PRD 用来指导黑客松 MVP 的产品、合约、SDK、API、前端和 demo 实现。它不描述完整商业平台，只描述可在短周期内交付和演示的最小可信产品。

## 2. 背景与问题

AI agents 正在从“建议”走向“执行”。当 agent 需要调用付费 API、MCP server、数据源或链上服务时，现有方式通常是：

- 使用 API key / Web2 subscription；
- 人工提前充值；
- 直接把钱包私钥或 signing authority 交给 agent；
- 自己写临时 allowlist / escrow / payment verifier。

这些方式的问题是：

- agent payment workflow 被 API key 和人工付款打断；
- 裸钱包授权风险过高；
- API provider 缺少可验证 receipt；
- owner 缺少 per-agent budget、merchant allowlist 和 human override；
- 普通 x402-style payment flow 解决了“如何付款”，但没有完整解决“agent 是否应该付款”。

AgentGuard 解决的问题：

> Give agents budgets, not private keys.

## 3. 目标与非目标

### 3.1 产品目标

MVP 必须证明：

1. AI agent 可以在 Solana 上为 paid API 自动付款。
2. 付款前，链上 program 会强制执行 policy。
3. 合法付款成功并生成 receipt。
4. 非法付款在资金转移前失败。
5. owner 可以通过 dashboard 或 Blink 暂停 agent。

### 3.2 黑客松成功目标

- 3 分钟 pitch video 中，评委能在 30 秒内理解核心价值。
- 3 分钟 technical demo 中，能看到真实 Solana program state 或 transaction。
- README 中能复现 localnet/devnet demo。
- 代码开源，核心逻辑清晰。
- 项目叙事明确区别于普通 wallet、payment link、AI chat 和 DeFi bot。

### 3.3 非目标

MVP 阶段明确不做：

- 真实主网资金托管；
- 完整 x402 facilitator；
- 自动 swap / DeFi strategy；
- 多链或跨链支付；
- 法币 on/off ramp；
- KYC/KYB/compliance onboarding；
- 自然语言 policy builder；
- 多组织、多角色权限系统；
- merchant marketplace；
- Token-2022 transfer hook；
- Agent Registry 深度集成；
- revenue share 或真实收费系统。

## 4. 用户画像

### 4.1 Owner / Agent Operator

描述：创建和管理 agent vault 的用户，可以是 builder、DAO ops、startup founder、团队财务负责人。

目标：

- 给 agent 一笔有限预算；
- 控制 agent 可以付给谁；
- 设置单笔和每日支出限制；
- 查看 agent 已经做了哪些付款；
- 一键暂停 agent。

核心痛点：

- 不敢把完整钱包控制权交给 agent；
- 手动批准每笔小额 API/payment 操作太低效；
- 需要付款日志和可审计 receipt。

### 4.2 Agent Developer

描述：构建 AI agent、workflow automation、MCP client 或 autonomous execution runtime 的开发者。

目标：

- 让 agent 在收到 402 challenge 后自动完成付款；
- 不自己实现复杂 vault 和 policy logic；
- 能用 SDK 构造交易；
- 能处理付款成功、失败和 retry。

核心痛点：

- agent payment 缺少安全授权层；
- 自己写 Solana payment policy 容易出错；
- 需要简单、可复用的 SDK 和 demo API 模板。

### 4.3 API / MCP / Data Provider

描述：提供 paid API、MCP server、数据接口或 agent-consumable service 的服务商。

目标：

- 通过 pay-per-call 向 agent 收费；
- 验证付款是否完成；
- 把 receipt 与 request 绑定；
- 降低集成成本。

核心痛点：

- API key/subscription 不适合 autonomous agent；
- 单纯 x402 payment 不一定包含 agent-side policy proof；
- 需要服务端验证 receipt。

### 4.4 Judge / Demo Viewer

描述：黑客松评委、投资人、生态方。

目标：

- 快速理解项目是否 Solana 原生；
- 看到真实链上交互；
- 看到 demo 的成功和失败路径；
- 判断项目是否有 startup 潜力。

核心痛点：

- 太多 AI + crypto demo 只是聊天 UI；
- 太多 payment demo 只是 wallet transfer；
- 需要在短时间看见“为什么现在、为什么 Solana、为什么你”。

## 5. 核心用例

### UC-01：Owner 创建 agent policy vault

目标：owner 为 agent 创建受控 vault。

前置条件：

- owner 已连接钱包；
- owner 知道 agent authority public key；
- 选择一个 test SPL token mint。

流程：

1. owner 输入 agent name、agent authority、per-tx limit、daily limit；
2. 前端派生 `AgentProfile`、vault authority、vault PDA；
3. owner 签名 `initialize_agent`；
4. program 创建 `AgentProfile` 和 vault token account；
5. 前端展示 vault 地址和 policy summary。

成功标准：

- `AgentProfile` account 存在；
- vault token account 存在；
- policy limit 正确；
- agent status 为 active。

### UC-02：Owner 存入测试 token

目标：owner 给 agent vault 提供可花预算。

前置条件：

- `AgentProfile` 已创建；
- owner 有 test SPL token；
- owner token account 存在。

流程：

1. owner 输入 deposit amount；
2. 前端构造 `deposit` transaction；
3. owner 签名；
4. program 执行 SPL token transfer；
5. 前端刷新 vault balance。

成功标准：

- owner token balance 减少；
- vault token balance 增加；
- dashboard 显示新余额。

### UC-03：Owner 添加 merchant allowlist

目标：owner 允许 agent 向特定 API provider 付款。

前置条件：

- agent profile 已创建；
- merchant wallet 地址已知。

流程：

1. owner 输入 merchant wallet、merchant label、max per payment；
2. 前端构造 `add_merchant` transaction；
3. owner 签名；
4. program 创建 `MerchantPolicy`；
5. dashboard 显示 merchant active。

成功标准：

- merchant policy PDA 存在；
- merchant active；
- max per payment 正确。

### UC-04：Agent 调 paid API 并付款成功

目标：agent 通过 AgentGuard 为 paid API 自动付款并解锁服务。

前置条件：

- agent profile active；
- vault 有余额；
- merchant 已 allowlisted；
- amount 小于 per-tx、daily 和 merchant cap。

流程：

1. agent client 请求 paid API；
2. API 返回 `402 Payment Required`；
3. response 包含 amount、merchant、requestHash、mint、agentProfile；
4. agent client 构造并提交 `agent_pay`；
5. program 检查 policy；
6. program 从 vault 转账给 merchant；
7. program 创建 `PaymentReceipt`；
8. agent client 带 receipt retry API；
9. API 验证 receipt 后返回 paid data。

成功标准：

- API 第一次返回 402；
- `agent_pay` transaction 成功；
- vault balance 减少；
- merchant balance 增加；
- receipt PDA 存在；
- retry API 返回 200；
- dashboard 显示 receipt。

### UC-05：Agent 超限付款失败

目标：证明 policy 是链上强制执行。

前置条件：

- agent profile active；
- merchant 已 allowlisted；
- requested amount 超过 per-tx、daily 或 merchant cap。

流程：

1. agent client 收到高额 402 challenge；
2. agent client 提交 `agent_pay`；
3. program 在 transfer 前拒绝；
4. API retry 不成功；
5. dashboard 或 terminal 显示 reject reason。

成功标准：

- transaction 失败；
- vault balance 不变；
- merchant balance 不变；
- no receipt created；
- reject reason 可见。

### UC-06：Owner 暂停 agent

目标：human override 能阻止 agent 继续付款。

前置条件：

- agent profile active。

流程：

1. owner 在 dashboard 点击 pause，或通过 Blink 执行 pause；
2. owner 签名 `set_pause(true)`；
3. program 更新 `AgentProfile.paused`；
4. agent 再次尝试付款；
5. program 拒绝。

成功标准：

- profile paused = true；
- dashboard status 显示 paused；
- agent payment 被拒绝；
- funds do not move。

## 6. 用户体验与页面结构

### 6.1 页面列表

MVP web app 不做 marketing landing page，默认进入工作台。

| 页面            | 路径                     | 目标用户             | 目的                                     |
| --------------- | ------------------------ | -------------------- | ---------------------------------------- |
| Overview        | `/`                      | owner / judge        | 展示 agent vault 状态和 demo 入口        |
| Create Agent    | `/agents/new`            | owner                | 创建 agent profile 和 vault              |
| Agent Detail    | `/agents/[id]`           | owner                | 查看 balance、policy、merchant、receipts |
| Policy          | `/agents/[id]/policy`    | owner                | 更新 per-tx/daily limits 和 pause 状态   |
| Merchants       | `/agents/[id]/merchants` | owner                | 管理 merchant allowlist                  |
| Receipts        | `/agents/[id]/receipts`  | owner / API provider | 查看 successful payments                 |
| Demo API        | `/demo`                  | judge / developer    | 展示 402 -> pay -> retry                 |
| Action Endpoint | `/api/actions/pause`     | wallet / Blink       | 返回 pause transaction                   |

### 6.2 Overview 页面需求

必须展示：

- connected wallet；
- selected agent；
- vault balance；
- agent status：active / paused；
- per-tx limit；
- daily limit；
- spent today；
- merchant count；
- receipt count；
- primary demo action：Run paid API demo。

状态：

- no wallet connected；
- no agent created；
- loading profile；
- active；
- paused；
- error。

### 6.3 Create Agent 页面需求

表单字段：

- agent label，前端展示用，不上链也可以；
- agent authority public key；
- token mint；
- per-tx limit；
- daily limit。

校验：

- public key 格式正确；
- per-tx limit > 0；
- daily limit >= per-tx limit；
- mint public key 格式正确。

成功后：

- 跳转 agent detail；
- 显示 agent profile PDA 和 vault address。

### 6.4 Agent Detail 页面需求

必须展示：

- agent profile address；
- agent authority；
- owner；
- mint；
- vault；
- vault balance；
- policy summary；
- allowlisted merchants；
- recent receipts；
- recent failed attempts，如果 API 服务有链下日志。

操作：

- deposit；
- add merchant；
- update policy；
- pause/resume；
- run demo API。

### 6.5 Demo API 页面需求

这是 pitch video 的核心页面。

必须展示四个阶段：

1. Request paid API；
2. Receive 402 challenge；
3. Pay through AgentGuard；
4. Retry and unlock response。

还必须支持一个失败 demo：

1. Request expensive API；
2. Attempt payment；
3. Program rejects over-limit payment；
4. Show funds did not move。

### 6.6 Receipts 页面需求

字段：

- timestamp；
- merchant；
- amount；
- request hash；
- receipt PDA；
- transaction signature；
- API resource label；
- status。

MVP 可以只显示 successful receipts。failed attempts 可由 API 或 dashboard 本地日志展示，不要求上链。

## 7. 功能需求

### 7.1 P0 功能

#### FR-001 Create Agent Profile

描述：owner 创建 agent profile 和 vault。

Program 映射：

- `initialize_agent(agent_authority, per_tx_limit, daily_limit)`

验收标准：

- 创建 `AgentProfile`；
- 创建 vault token account；
- profile 字段正确；
- invalid limits 被拒绝。

#### FR-002 Deposit Funds

描述：owner 向 vault 存入测试 SPL token。

Program 映射：

- `deposit(amount)`

验收标准：

- amount > 0；
- owner token account mint 匹配；
- vault 余额增加；
- wrong mint 被拒绝。

#### FR-003 Add Merchant Policy

描述：owner 添加 allowlisted merchant。

Program 映射：

- `add_merchant(merchant, max_per_payment)`

验收标准：

- merchant policy PDA 创建；
- max per payment > 0；
- merchant active；
- 非 owner 无法添加。

#### FR-004 Agent Pay

描述：agent authority 在 policy 内付款给 merchant。

Program 映射：

- `agent_pay(amount, request_hash)`

验收标准：

- agent authority 必须匹配；
- agent 未 paused；
- merchant active；
- amount <= per_tx_limit；
- amount <= daily remaining；
- amount <= merchant max；
- token transfer 成功；
- receipt PDA 创建。

#### FR-005 Reject Invalid Payments

描述：非法付款必须在资金转移前失败。

失败场景：

- unknown merchant；
- inactive merchant；
- wrong agent authority；
- paused agent；
- amount > per_tx_limit；
- amount > daily limit；
- amount > merchant max；
- wrong merchant token owner；
- wrong mint；
- duplicate request hash。

验收标准：

- transaction fails；
- vault balance unchanged；
- merchant balance unchanged；
- no receipt created。

#### FR-006 x402-style Paid API

描述：demo API 返回 HTTP 402 challenge，并在 receipt 验证后返回 paid data。

API 映射：

- `GET /paid/weather-alpha`
- `GET /paid/weather-expensive`

未付款响应：

```json
{
  "error": "payment_required",
  "amount": "10000",
  "mint": "<mint>",
  "merchant": "<merchant>",
  "agentProfile": "<agent-profile>",
  "requestHash": "<32-byte-hash>"
}
```

付款后请求：

- header: `x-agentguard-receipt`
- optional header: `x-agentguard-signature`

验收标准：

- no receipt -> 402；
- valid receipt -> 200；
- wrong requestHash -> 403；
- insufficient amount -> 403；
- wrong merchant -> 403。

#### FR-007 Agent Client

描述：脚本或 SDK demo 自动完成 402 -> pay -> retry。

交付物：

- `scripts/agent-client.ts`

验收标准：

- 能请求 paid API；
- 能解析 challenge；
- 能提交 `agent_pay`；
- 能 retry；
- 能展示 success 和 failure。

#### FR-008 Minimal Dashboard

描述：用户能通过 UI 完成核心 demo。

验收标准：

- wallet connect；
- create agent；
- deposit；
- add merchant；
- run API demo；
- show receipt；
- pause/resume。

#### FR-009 Human Pause

描述：owner 可以暂停 agent。

Program 映射：

- `set_pause(paused)`

验收标准：

- dashboard pause 可用；
- paused 后 `agent_pay` 失败；
- resume 后合法 payment 可继续。

#### FR-010 README Runbook

描述：评委和开发者可复现项目。

必须包含：

- install；
- build；
- test；
- create demo mint；
- seed demo；
- run API；
- run agent client；
- run web app；
- known limitations。

### 7.2 P1 功能

#### FR-011 Withdraw Funds

描述：owner 从 vault 取回未使用资金。

优先级：P1

验收标准：

- 只有 owner 可 withdraw；
- amount > 0；
- vault balance 足够；
- owner token account mint 匹配。

#### FR-012 Deactivate Merchant

描述：owner 禁用 merchant。

优先级：P1

验收标准：

- merchant active 设置为 false；
- inactive merchant payment 被拒绝。

#### FR-013 Blink Pause

描述：通过 Solana Action/Blink 执行 pause。

优先级：P1

API：

- `GET /api/actions/pause`
- `POST /api/actions/pause`

验收标准：

- GET 返回 Action metadata；
- POST 返回可签名 transaction；
- wallet 签名后 agent paused。

### 7.3 P2 功能

- one-time approval；
- session voucher；
- signed API challenge；
- receipt explorer page；
- webhook notification；
- Token-2022 metadata；
- team policy admin。

## 8. 非功能需求

### 8.1 安全

- 所有资金转移前必须先完成 policy checks。
- owner-only instructions 必须有 `has_one = owner` 或等价约束。
- agent-only instructions 必须检查 `agent_authority`。
- token mint 必须匹配 profile mint。
- merchant token account owner 必须等于 merchant。
- receipt request hash 必须防重复。
- MVP README 必须声明：not audited, devnet/local only。

### 8.2 可演示性

- Demo 必须能在 3 分钟内完成。
- 必须有 success path 和 reject path。
- UI/CLI 必须显示余额变化或余额不变。
- 必须能展示 receipt PDA。

### 8.3 可复现性

- 本地开发者应能通过 README 跑通 local validator demo。
- 所有 seed/demo 脚本应使用 `.env` 或命令行参数。
- 失败时输出清晰错误。

### 8.4 性能

MVP 不追求高性能，但应满足：

- dashboard 页面交互不阻塞；
- API receipt verification 在 2 秒内返回，local/devnet 环境除外；
- agent client 有 retry/backoff。

### 8.5 兼容性

- MVP 支持 localnet；
- devnet 为 P1；
- mainnet 不支持；
- token 使用 SPL Token，Token-2022 不作为 P0。

## 9. 数据模型

### 9.1 On-chain Accounts

#### AgentProfile

字段：

- owner；
- agent_authority；
- mint；
- vault；
- per_tx_limit；
- daily_limit；
- spent_in_window；
- window_start；
- paused；
- created_at；
- bump；
- vault_authority_bump。

#### MerchantPolicy

字段：

- agent_profile；
- merchant；
- max_per_payment；
- active；
- bump。

#### PaymentReceipt

字段：

- agent_profile；
- agent_authority；
- merchant；
- amount；
- request_hash；
- timestamp；
- window_start；
- bump。

### 9.2 Off-chain Demo State

MVP 可使用内存或 JSON 文件保存：

- API resource label；
- request hash -> resource；
- failed attempts；
- UI display labels；
- merchant alias；
- transaction signature mapping。

生产版本再考虑数据库。

## 10. API 需求

### 10.1 Demo Paid API

#### `GET /paid/weather-alpha`

行为：

- 如果没有 `x-agentguard-receipt`，返回 402。
- 如果 receipt 有效，返回 demo paid data。

#### `GET /paid/weather-expensive`

行为：

- 返回高于 policy limit 的 challenge，用于演示失败路径。

### 10.2 Receipt Verification

服务端 helper：

```ts
verifyReceipt({
  connection,
  program,
  receipt,
  expectedAgentProfile,
  expectedMerchant,
  expectedRequestHash,
  minimumAmount,
});
```

必须校验：

- receipt account exists；
- `agent_profile` matches；
- `merchant` matches；
- `request_hash` matches；
- `amount >= minimumAmount`；
- timestamp not expired，如果实现 TTL。

### 10.3 Action / Blink API

P1：

- `GET /api/actions/pause`
- `POST /api/actions/pause`

返回：

- action title；
- icon；
- description；
- label；
- transaction。

## 11. SDK 需求

### 11.1 PDA Helpers

已存在/需保留：

- `deriveAgentProfile`
- `deriveVaultAuthority`
- `deriveVault`
- `deriveMerchantPolicy`
- `deriveReceipt`

### 11.2 Transaction Builders

需新增：

- `buildInitializeAgentTx`
- `buildDepositTx`
- `buildAddMerchantTx`
- `buildSetPolicyTx`
- `buildSetPauseTx`
- `buildAgentPayTx`

### 11.3 Agent Payment Helper

需新增：

```ts
payChallengeWithAgentGuard(challenge, signer, options);
```

行为：

- validate challenge；
- derive accounts；
- build `agent_pay`；
- submit transaction；
- return receipt PDA and signature。

## 12. Demo Requirements

### 12.1 Pitch Demo

必须讲清楚：

- 问题：agent 需要付款，但不能给私钥；
- 方案：policy vault；
- Solana 原生性：PDA、SPL、receipt、Blinks；
- demo：成功 + 失败；
- business：API providers / agent builders / DAO ops。

### 12.2 Technical Demo

必须展示：

1. `anchor test` 或 e2e test output；
2. create agent；
3. deposit；
4. add merchant；
5. paid API returns 402；
6. agent pays；
7. receipt created；
8. retry API returns paid data；
9. over-limit payment fails；
10. pause agent。

### 12.3 Demo Acceptance

完成标准：

- 评委可以看到至少一笔 successful payment；
- 评委可以看到至少一笔 rejected payment；
- receipt PDA 可查；
- README 可复现；
- 项目没有承诺主网安全。

## 13. 里程碑

### M1：Program e2e

交付：

- test mint；
- initialize/deposit/add merchant；
- agent pay success；
- receipt created；
- reject paths。

验收：

- `anchor test` 或 equivalent e2e 通过。

### M2：x402-style API + Agent Client

交付：

- paid API；
- receipt verifier；
- agent client。

验收：

- CLI 可以完成 402 -> pay -> retry。

### M3：Dashboard

交付：

- overview；
- create agent；
- policy；
- merchants；
- receipts；
- demo API 页面。

验收：

- UI 可以跑通 demo 主路径，或清楚触发 CLI demo。

### M4：Human Override

交付：

- dashboard pause；
- optional Blink pause。

验收：

- paused agent 无法付款。

### M5：Submission Pack

交付：

- README runbook；
- pitch video；
- technical demo video；
- known limitations；
- deployment links，如果有。

## 14. 验收标准总表

| 类别         | 验收标准                                            | 必须/可选    |
| ------------ | --------------------------------------------------- | ------------ |
| Program      | success payment transfers funds and creates receipt | 必须         |
| Program      | over-limit payment fails before transfer            | 必须         |
| Program      | paused payment fails before transfer                | 必须         |
| Program      | wrong merchant or wrong authority fails             | 必须         |
| API          | no receipt returns 402                              | 必须         |
| API          | valid receipt unlocks paid data                     | 必须         |
| Agent client | handles 402 -> pay -> retry                         | 必须         |
| UI           | shows policy, balance, receipts                     | 必须         |
| UI           | pause/resume available                              | 必须         |
| Blink        | pause through Action/Blink                          | 可选但强推荐 |
| Docs         | local runbook complete                              | 必须         |
| Security     | README says devnet/local only and unaudited         | 必须         |

## 15. 风险与缓解

| 风险               | 影响                | 缓解                            |
| ------------------ | ------------------- | ------------------------------- |
| 被认为只是钱包限额 | 降低 novelty        | demo 从 paid API 402 开始       |
| x402 完整集成超时  | 延误交付            | 只做 x402-style mock flow       |
| 合约安全问题       | 资金风险            | devnet/local only、失败路径测试 |
| Blink 卡住         | UX 少一个亮点       | dashboard pause 保底            |
| Dashboard 超时     | 主路径不完整        | CLI demo 保底                   |
| 付费意愿不确定     | business score 受限 | 访谈 6-10 人，拿 pilot quote    |
| Scope creep        | 无法提交            | 严格执行 P0/P1/P2               |

## 16. Open Questions

需要尽快回答：

1. `withdraw` 是否进入 P0？建议 P1，但如果 demo 需要完整资金闭环，可提前。
2. receipt 是否必须记录 tx signature？链上 account 不知道 tx signature，建议 UI/indexer 记录。
3. request hash 是否需要 signed challenge？MVP 可不做，生产必须做。
4. devnet token 是否使用真实 USDC devnet mint 还是自建 test mint？建议自建 test mint，文案称 test USDC。
5. Blink pause 是否必须？建议 P1，dashboard pause 作为保底。

## 17. Implementation Backlog

### P0 Backlog

1. `tests/agentguard-e2e.ts`
2. `scripts/create-test-mint.ts`
3. `scripts/seed-demo.ts`
4. SDK transaction builders
5. `services/x402-demo-api/src/verifyReceipt.ts`
6. `scripts/agent-client.ts`
7. dashboard create agent
8. dashboard deposit
9. dashboard merchant policy
10. dashboard receipts
11. dashboard pause
12. README runbook

### P1 Backlog

1. `withdraw`
2. `deactivate_merchant`
3. Blink pause endpoint
4. devnet deployment
5. demo merchant interview quote
6. API TTL/replay protection

### P2 Backlog

1. one-time approval
2. signed API challenge
3. webhooks
4. session authority
5. Token-2022 metadata
6. Agent Registry identity

## 18. Final Product Decision

AgentGuard Protocol MVP is approved for implementation.

Decision:

> Build the smallest credible agentic payment control demo: policy vault, paid API, receipt, rejection, and human override.

The product must stay narrow. The hackathon submission should prove one thing exceptionally well:

> Agents can pay on Solana, but only inside owner-defined on-chain policies.
