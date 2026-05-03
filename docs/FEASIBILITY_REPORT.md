# AgentGuard Protocol 详细可行性研究报告

生成日期：2026-05-03  
项目阶段：Solana Frontier Hackathon / MVP 立项  
建议结论：**Go，但必须保持窄 MVP 范围**  
推荐优先级：**最高优先级，适合作为黑客松主项目提交**

## 1. 执行摘要

AgentGuard Protocol 是一个面向 AI agent 的 Solana 原生支付控制层。它允许用户把资金放入受策略约束的链上 vault，再授权 agent 在预算、商户白名单、单笔限额、日限额和暂停开关内执行支付。项目的核心不是“AI 钱包聊天机器人”，而是 **agentic payment control layer**：当 agent 通过 HTTP 402 / x402 风格流程访问付费 API 或数据服务时，AgentGuard 在资金转出前执行链上策略检查，并生成可审计 receipt。

本报告的核心判断：

- **市场时机强**：Solana 官方已经把 x402 / agentic payments 放入开发者文档，Solana x402 页面展示 37M+ Solana x402 transactions、20K+ buyers and sellers、70% monthly volume on Solana。这说明 agentic payments 已经不是纯概念，剩余空白更集中在控制、安全、审计和 human override。
- **黑客松适配强**：MVP 可以在短周期内做出真实 Solana 交互：创建 vault、存入测试 USDC/SPL token、添加 merchant、agent 付款、receipt PDA、超限拒绝、Blink pause/approve。
- **Solana 原生性强**：项目用到 SPL token、PDA vault、Anchor account constraints、Blinks/Actions、低费高频结算和 x402-style HTTP payment flow，不是普通 Web2 产品加钱包登录。
- **技术可行，但需要克制**：当前 repo 已有 Anchor program 初版、SDK 占位、x402 demo API 占位、Next.js dashboard 占位，并通过 `anchor build`、SDK/API typecheck 和 web build。接下来最大工作量是 e2e demo、测试、Blinks 和可视化。
- **商业潜力中高，但需验证付费意愿**：API providers、MCP providers、agent builders、DAO automation teams 都是合理目标用户；但“是否愿意为 agent spending controls 付费”仍需访谈验证。
- **最大风险**：评委或用户可能把它理解成“钱包限额功能”。必须通过 x402-style agent payment demo 证明它是机器支付场景的 policy firewall，而不是普通钱包插件。

最终建议：以 AgentGuard Protocol 作为主项目继续推进。MVP 只做 **one agent vault + one paid API + one merchant + limits + receipt + reject path + one Blink override**。不要在黑客松阶段扩展到 swap、跨链、真实主网资金、完整 x402 facilitator、团队权限系统或复杂 AI 策略语言。

## 2. 研究方法与信息来源

本报告使用三类证据：

1. **官方与生态证据**：Solana x402、Solana agentic payments docs、Solana payments docs、Actions/Blinks docs、Token Extensions docs、Solana Developer Platform、Colosseum Frontier Hackathon。
2. **链上活动背景数据**：DefiLlama Solana TVL、stablecoin circulating value、DEX volume、fees API。此类数据只用于证明 Solana 生态活动和支付/DeFi rails 活跃，不直接证明 AgentGuard PMF。
3. **本项目实现状态**：当前 repo 中 Anchor program、SDK、demo API、web app 和验证命令结果。

关键来源：

- [Solana x402](https://solana.com/x402)
- [Solana Agentic Payments](https://solana.com/docs/payments/agentic-payments)
- [Solana Basic Payment](https://solana.com/docs/payments/send-payments/basic-payment)
- [Solana Payment with Memo](https://solana.com/docs/payments/send-payments/payment-with-memo)
- [Solana Actions and Blinks](https://solana.com/developers/guides/advanced/actions)
- [Solana Token Extensions](https://solana.com/solutions/token-extensions)
- [Solana Developer Platform announcement](https://solana.com/es/news/solana-developer-platform)
- [Solana Ecosystem Security](https://solana.com/news/solana-ecosystem-security)
- [Colosseum Frontier Hackathon announcement](https://blog.colosseum.com/announcing-the-solana-frontier-hackathon/)
- [DefiLlama chains API](https://api.llama.fi/v2/chains)
- [DefiLlama stablecoins API](https://stablecoins.llama.fi/stablecoins?includePrices=true)
- [DefiLlama Solana DEX API](https://api.llama.fi/overview/dexs/Solana?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true)
- [DefiLlama Solana fees API](https://api.llama.fi/overview/fees/Solana?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyFees)

## 3. 项目定义

### 3.1 项目名称

AgentGuard Protocol

### 3.2 英文 tagline

Programmable spending limits for autonomous agents on Solana.

### 3.3 产品定义

AgentGuard Protocol 是一个 Solana 原生的 agent spending firewall。用户或团队为 agent 创建一个链上 policy vault，设置允许支付的 merchant、预算和风控规则，然后 agent 只能在这些规则内执行付款。每笔成功支付都会生成链上 receipt，失败支付会在资金转移前被 program 拒绝。

### 3.4 一句话定位

AgentGuard lets AI agents pay for APIs and on-chain services on Solana without giving them unrestricted wallet access.

### 3.5 黑客松 MVP 定位

MVP 不是完整 agent wallet，也不是完整 x402 facilitator。MVP 是一个可演示的 **x402-style payment control path**：

```text
Agent calls paid API
  -> API returns HTTP 402 challenge
  -> Agent submits AgentGuard agent_pay transaction
  -> Program checks policy before token transfer
  -> Program writes PaymentReceipt PDA
  -> Agent retries API with receipt
  -> API returns paid content
```

## 4. 市场与生态可行性

### 4.1 Agentic payments 正在从概念进入开发者 primitive 阶段

Solana 官方 x402 页面把 x402 定位为 AI agents 的 internet-native payments，并列出生态工具和使用指标。Solana agentic payments 文档进一步解释了 HTTP 402 challenge、signed payment retry、facilitator settlement、SPL token payment terms 等流程。

这对 AgentGuard 的意义很直接：

- 付款协议本身正在标准化，AgentGuard 不需要自创支付协议。
- API provider 可以通过 x402 风格流程收费，但仍需要风控、预算和审计。
- Agent builder 可以让 agent 自动付款，但不能安全地裸给 agent 一个无限钱包。
- AgentGuard 可以站在 x402 之上，做 policy enforcement 和 observability。

结论：市场 timing 是强正向信号。

### 4.2 Solana payment rails 活跃，适合小额、实时、程序化支付

Solana payments docs 把 Solana 描述为适合全球 token transfers、stablecoin payments、payroll、treasury operations 的基础设施，强调低费用和快速结算。AgentGuard 的 payment flow 本质上是更强约束的 token transfer：转账不是由人直接发起，而是由 agent 在 policy program 约束下发起。

截至 2026-05-03 本次调研运行，DefiLlama API 显示：

| 指标                                |       数值 | 用途                              |
| ----------------------------------- | ---------: | --------------------------------- |
| Solana TVL                          |  约 $5.42B | 说明生态有足够资金活动背景        |
| Solana pegged-USD circulating value | 约 $14.76B | 说明稳定币/美元锚定资产流动性充足 |
| Solana DEX 24h volume               | 约 $965.5M | 说明执行和流动性活跃              |
| Solana DEX 30d volume               |  约 $41.0B | 说明交易活动持续存在              |
| Solana 30d fees                     | 约 $170.9M | 说明链上使用强度高                |

这些数据不证明 AgentGuard 已经有 PMF，但证明 Solana 不是空链，支付、结算、自动化执行产品有真实基础设施环境。

### 4.3 Colosseum Frontier 的评审逻辑适合窄 MVP + startup wedge

Colosseum Frontier Hackathon 运行时间为 2026-04-06 到 2026-05-11，官方说明其不是传统 hackathon，而是 intensive engineering and business sprint，并移除了 tracks 和 bounties。评审更偏产品影响力、可运行功能、创业潜力和清晰 demo。

AgentGuard 符合这个方向：

- 有清晰的 Solana 原生 transaction path。
- 有创业叙事：agent economy 的 spending control layer。
- 有基础设施属性，适合开源和 composability。
- Demo 可以在 3 分钟内讲清楚。
- 不依赖大型 BD、真实主网资金或复杂合规集成。

### 4.4 支撑 primitive 成熟度

| Primitive                     | 成熟度 | AgentGuard 用法                              | 风险                          |
| ----------------------------- | ------ | -------------------------------------------- | ----------------------------- |
| Anchor                        | 高     | Program、PDA、account constraints、tests     | 安全实现需审计                |
| SPL Token                     | 高     | Vault deposit 和 merchant payment            | Token decimals/ATA 处理需谨慎 |
| x402-style flow               | 中高   | HTTP 402 challenge + paid retry              | 生态标准仍早期演进            |
| Actions/Blinks                | 高     | Human pause/approve/raise-limit UX           | 钱包兼容性需测试              |
| Token Extensions              | 中高   | 后续 metadata、required memo、transfer hooks | MVP 不建议依赖复杂组合        |
| Helius/QuickNode RPC/indexing | 高     | Receipt indexing、dashboard refresh          | RPC rate limits 和成本        |

## 5. 用户与痛点可行性

### 5.1 核心用户分层

#### 用户 1：AI agent / workflow builder

场景：

- agent 需要调用付费 API、MCP server、数据源、推理服务。
- agent 需要在任务执行中自动完成小额付款。
- builder 不希望把私钥或无限额度交给 agent runtime。

痛点：

- API keys 和订阅打断 agent workflow。
- 直接给 agent 钱包风险过高。
- 缺少 per-agent budget、merchant allowlist、receipt、spend logs。

AgentGuard 价值：

- 用链上 policy 把 agent 的可执行范围显式化。
- 支持每个 agent 独立预算和独立 merchant policy。
- 为每次付费请求留下 receipt。

#### 用户 2：API provider / MCP provider / data seller

场景：

- 想把 API 改成 pay-per-call，而不是账号订阅。
- 希望面向 AI agents 收费。
- 需要验证付款，但不想自己处理复杂钱包和 settlement。

痛点：

- x402 可以解决付费请求，但 abuse control、payer identity、spend confidence 仍不完整。
- API provider 需要知道付款是否真实 settlement。
- 对 agent 付款方缺少信任与可审计记录。

AgentGuard 价值：

- 提供更可信的付款来源：来自受 policy 控制的 vault。
- receipt PDA 可被服务端验证。
- merchant 可以要求付款必须经过 AgentGuard policy。

#### 用户 3：DAO / startup ops / treasury automation team

场景：

- 小团队让 agent 自动处理供应商付款、API 订阅、数据购买、任务执行。
- 负责人希望设置预算，而不是每笔手动签名。

痛点：

- 多签安全但不适合高频小额 agent 执行。
- 普通钱包方便但没有策略控制。
- 财务和运营需要 spend logs 和 human override。

AgentGuard 价值：

- 介于多签和自动化 wallet 之间：可自动执行，但边界明确。
- 预算、白名单、暂停开关降低失控风险。
- Dashboard 和 receipt 支持对账。

### 5.2 Jobs To Be Done

| 用户          | Job                        | 当前替代方案              | 替代方案不足                   |
| ------------- | -------------------------- | ------------------------- | ------------------------------ |
| Agent builder | 让 agent 自动购买 API 数据 | API key、信用卡、裸钱包   | 不适合 autonomous pay-per-call |
| API provider  | 对 agent 请求按次收费      | 订阅、API key、x402 basic | 缺少 payer policy 和风险可见性 |
| DAO ops       | 给 agent 小额预算自动执行  | Multisig、人肉审批        | 高频小额场景效率低             |
| Developer     | 为 agent app 接入安全支付  | 自写 escrow/allowlist     | 安全成本高，重复造轮子         |

### 5.3 痛点强度评估

| 痛点                                          | 严重度 | 频率 | Solana 特异性 | 可构建性 | 付费意愿置信度 |
| --------------------------------------------- | -----: | ---: | ------------: | -------: | -------------: |
| agent 不能安全持有可花资金                    |      9 |    7 |             9 |        8 |              7 |
| x402/basic payment 缺少预算与 human override  |      8 |    7 |             8 |        8 |              6 |
| API provider 缺少 agent payment observability |      7 |    6 |             7 |        8 |              6 |
| DAO 高频小额支出审批慢                        |      7 |    6 |             7 |        7 |              6 |
| receipt / reconciliation 不标准               |      7 |    7 |             8 |        8 |              6 |

结论：痛点足够支撑黑客松项目，但商业付费意愿仍需访谈验证。最需要验证的问题是：用户愿意为“agent spending control”付费，还是只把它当成 x402 工具链里的免费基础功能？

## 6. 竞品与差异化

### 6.1 竞品类别

| 类别                        | 代表                                      | 强项                         | AgentGuard 差异                                          |
| --------------------------- | ----------------------------------------- | ---------------------------- | -------------------------------------------------------- |
| 通用钱包                    | Phantom、Backpack、Solflare 等            | 用户资产管理、签名体验       | 不负责 agentic payment policy                            |
| 多签/金库                   | Squads 等                                 | 团队审批、安全治理           | 高频小额 agent execution 不自然                          |
| x402 facilitator / toolkit  | PayAI、Corbits、x402 reference tooling 等 | 支付协议和 API monetization  | AgentGuard 做付款前 policy enforcement 和 receipt        |
| Embedded wallet / key infra | Privy、Turnkey、Coinbase CDP 等           | 钱包创建、密钥管理、用户抽象 | 不等同于链上预算和 merchant rules                        |
| 安全/风险层                 | T54 / x402Secure 等                       | identity、verification、risk | AgentGuard 切入 Solana policy vault + agent spend ledger |
| 自建 escrow/allowlist       | 每个项目自己写                            | 灵活                         | 重复、安全风险、缺少标准接口                             |

### 6.2 关键差异

AgentGuard 不应该和 x402 facilitator 正面竞争，而应成为 x402 付款前后的控制层：

```text
x402 tells the server how to ask for payment.
AgentGuard tells the agent whether it is allowed to pay.
```

差异化关键词：

- Policy before payment
- Agent-specific vault
- Merchant allowlist
- Spend caps
- Onchain receipt
- Human override through Blink
- Open-source SDK for agent builders

### 6.3 容易混淆的定位

不要这样讲：

- AI wallet
- Smart wallet
- Multisig replacement
- DeFi automation bot
- x402 facilitator

应该这样讲：

- Agent spending firewall
- Policy vault for machine payments
- Control layer for x402 on Solana
- Auditable agent payment rail

## 7. 产品可行性

### 7.1 MVP 功能范围

必须实现：

1. 创建 agent profile 和 vault。
2. Owner deposit 测试 SPL token。
3. Owner 设置 per-transaction limit、daily limit、pause flag。
4. Owner 添加 merchant allowlist 和 merchant cap。
5. Agent 调用 `agent_pay`。
6. Program 在转账前检查：
   - agent authority 是否匹配；
   - agent 是否 paused；
   - merchant 是否 active；
   - amount 是否超过 per_tx_limit；
   - amount 是否超过 merchant cap；
   - amount 是否超过 daily_limit。
7. Program 完成 SPL token transfer。
8. Program 写入 PaymentReceipt PDA。
9. Demo API 验证 receipt 或 tx signature 后返回付费内容。
10. Blink/Action 支持 pause 或 approve/raise-limit 的最小路径。

### 7.2 非 MVP 范围

黑客松阶段明确不做：

- 真实主网 USDC 资金托管。
- 完整 x402 facilitator。
- 自动 swap / DeFi 策略。
- 多链支付。
- 法币 on/off ramp。
- 企业合规/KYB/KYC。
- 复杂自然语言 policy。
- 多组织、多角色权限。
- 收益或资金管理。

### 7.3 Demo 必须出现的 aha moment

最强 demo 不是“创建钱包”，而是：

1. 同一个 agent 请求两个 API payment。
2. 第一次在预算内，付款成功，API 解锁内容。
3. 第二次超出预算，链上 program 在转账前拒绝。
4. Owner 用 Blink 暂停或调整 policy。
5. Dashboard 显示 receipt 和 reject reason。

### 7.4 功能优先级

| 优先级 | 功能                | 理由                     |
| ------ | ------------------- | ------------------------ |
| P0     | policy vault        | 核心价值                 |
| P0     | merchant allowlist  | 防止 agent 乱付          |
| P0     | per-tx/daily cap    | spending firewall 的基础 |
| P0     | receipt PDA         | 审计和 API retry proof   |
| P0     | x402-style API demo | 证明不是普通钱包         |
| P1     | dashboard           | pitch video 需要         |
| P1     | Blink pause         | Solana 原生 UX           |
| P2     | one-time approval   | 很有价值，但可后置       |
| P2     | Token-2022 metadata | 可提升支付归因，但非必须 |
| P3     | Agent Registry      | 叙事好，但别卡住 MVP     |

## 8. 技术可行性

### 8.1 当前 repo 状态

当前项目目录：[agentguard-protocol](/Users/xiadawei/codeSpace/web3/hackathon/agentguard-protocol)

已完成骨架：

- Anchor program：[programs/agentguard-protocol/src/lib.rs](../programs/agentguard-protocol/src/lib.rs)
- TypeScript SDK：[packages/sdk/src/index.ts](../packages/sdk/src/index.ts)
- x402 demo API：[services/x402-demo-api/src/server.ts](../services/x402-demo-api/src/server.ts)
- Next.js dashboard placeholder：[apps/web/src/app/page.tsx](../apps/web/src/app/page.tsx)
- MVP docs：[MVP.md](./MVP.md)
- Architecture docs：[ARCHITECTURE.md](./ARCHITECTURE.md)

已验证：

- `anchor build` 通过。
- `pnpm lint` 通过。
- `pnpm --filter @agentguard/sdk typecheck` 通过。
- `pnpm --filter @agentguard/x402-demo-api typecheck` 通过。
- `pnpm --filter @agentguard/web build` 通过。
- `pnpm test:ts` 通过 1 个 PDA 单测。

注意：当前还不是完整 MVP，缺少 token mint/demo seed、完整 Anchor e2e 测试、Action/Blink endpoint、receipt verification 和 dashboard 交易交互。

### 8.2 Program 设计可行性

当前 program 已定义 3 个核心 accounts：

#### `AgentProfile`

存储：

- owner
- agent_authority
- mint
- vault
- per_tx_limit
- daily_limit
- spent_in_window
- window_start
- paused
- bumps

可行性：高。该结构足够支撑黑客松 MVP。

#### `MerchantPolicy`

存储：

- agent_profile
- merchant
- max_per_payment
- active
- bump

可行性：高。白名单 PDA 可以防止 agent 向任意地址付款。

#### `PaymentReceipt`

存储：

- agent_profile
- agent_authority
- merchant
- amount
- request_hash
- timestamp
- window_start
- bump

可行性：高。`receipt` 使用 `agent_profile + request_hash` 派生，可作为 paid API retry 的 proof。

### 8.3 Instruction 设计可行性

| Instruction                | 当前状态 | 可行性 | 备注                        |
| -------------------------- | -------- | -----: | --------------------------- |
| `initialize_agent`         | 已实现   |     高 | 创建 profile 和 token vault |
| `deposit`                  | 已实现   |     高 | owner 存入 SPL token        |
| `set_policy`               | 已实现   |     高 | 设置 per-tx/daily limits    |
| `set_pause`                | 已实现   |     高 | human override 基础         |
| `add_merchant`             | 已实现   |     高 | merchant allowlist          |
| `agent_pay`                | 已实现   |     高 | 执行检查、转账、写 receipt  |
| `remove_merchant`          | 未实现   |     中 | MVP 可不做，但生产需要      |
| `approve_one_time_payment` | 未实现   |     中 | demo 可用 set_policy 暂代   |
| `withdraw`                 | 未实现   |     中 | MVP 可后置，但用户需要      |

### 8.4 x402-style demo 可行性

完整 x402 facilitator 的实现不适合黑客松短周期。但 x402-style demo 完全可行：

1. API endpoint 返回 `402 Payment Required`。
2. Response body 包含 `amount`、`merchant`、`requestHash`、`mint`、`agentProfile`。
3. Agent client 调 SDK 构造 `agent_pay`。
4. 交易成功后，agent retry，header 带 `x-agentguard-receipt` 或 tx signature。
5. API 服务端从链上读取 receipt account，校验：
   - receipt 存在；
   - merchant 匹配；
   - amount 足够；
   - requestHash 匹配；
   - timestamp 在可接受窗口内。

这样不需要实现完整 facilitator，也能让评委理解产品价值。

### 8.5 Blink/Action 可行性

Solana Actions/Blinks 适合做 human override：

- `GET /api/actions/pause-agent` 返回 metadata。
- `POST /api/actions/pause-agent` 返回 `set_pause(true)` transaction。
- 可选：`POST /api/actions/raise-limit` 返回 `set_policy(...)` transaction。

MVP 优先做 `pause`，因为它最容易解释，也最能体现安全控制。

### 8.6 技术复杂度评估

| 模块                     | 难度 | 预计工时 | 主要风险                             |
| ------------------------ | ---: | -------: | ------------------------------------ |
| Anchor policy program    |   中 |   2-4 天 | account constraint 和 token CPI 细节 |
| Token mint / e2e tests   |   中 |   1-2 天 | 本地 validator、ATA、decimals        |
| SDK transaction builders |   中 |   1-2 天 | IDL 类型、PDA 派生                   |
| x402-style API           | 低中 |     1 天 | receipt verification                 |
| Agent client demo        |   中 |     1 天 | 交易签名和 retry flow                |
| Dashboard                |   中 |   2-4 天 | wallet adapter、状态同步             |
| Blink pause              |   中 |   1-2 天 | Action spec、CORS、wallet 兼容       |
| Pitch/demo polish        |   中 |     2 天 | 演示稳定性                           |

结论：技术可行，关键是避免扩 scope。

## 9. 安全可行性与威胁模型

### 9.1 资产风险

AgentGuard 的 vault 持有用户资金。即使 MVP 用 devnet token，生产版本也属于高风险 smart contract custody / controlled vault 场景，必须谨慎设计。

### 9.2 主要威胁

| 威胁                     | 影响                    | 当前缓解                               | 仍需补强                           |
| ------------------------ | ----------------------- | -------------------------------------- | ---------------------------------- |
| agent 私钥泄露           | 攻击者在规则内花光预算  | daily limit、merchant allowlist、pause | session key、short-lived authority |
| owner 私钥泄露           | 政策和提款被控制        | 不在 MVP 解决                          | multisig/Squads owner              |
| merchant policy 被绕过   | 资金流向错误地址        | merchant PDA + token owner constraint  | remove/deactivate merchant         |
| request_hash 重放        | 重复解锁 API 或重复支付 | receipt PDA 防同 hash 重复             | API 侧 nonce/TTL                   |
| daily spend 计算错误     | 超额付款                | window_start + spent_in_window         | 测试边界和时区/slot 模型           |
| vault authority spoofing | 非法签名转账            | PDA seeds + bump                       | 完整 e2e tests                     |
| malicious API challenge  | agent 被诱导付款        | allowlist + amount cap                 | merchant identity UI               |
| RPC/indexer 不一致       | receipt 验证延迟        | 直接读链上 account                     | retry/backoff                      |

### 9.3 安全建议

黑客松 MVP：

- 只使用 devnet/local test token。
- 明确声明未审计，不可用于主网资金。
- 每个失败路径都有测试：
  - unknown merchant
  - over per-tx limit
  - over daily limit
  - paused agent
  - wrong agent authority
  - wrong merchant token owner
  - duplicate receipt request hash

生产前：

- 外部 audit。
- 添加 `withdraw` 和 emergency pause。
- 支持 multisig owner。
- 支持 session authority。
- 支持 merchant revoke/deactivate。
- 对 API challenge 引入 signed challenge 或 domain binding。
- 对 receipt 引入 expiry 和 replay protection。

## 10. 合规与运营可行性

### 10.1 黑客松阶段

黑客松阶段只使用 localnet/devnet token 或明确标记的 test SPL token，不涉及真实资金、法币通道、托管业务、收益承诺、投资建议或跨境支付服务。因此合规风险可控。

### 10.2 生产阶段

生产版本需谨慎处理：

- 如果支持真实 USDC 支付，需要明确非托管/合约托管边界。
- 如果面向企业、DAO 或商户，需要考虑 KYB/KYC、sanctions screening、Travel Rule、税务和发票对账需求。
- 如果提供 hosted dashboard 和自动化执行，需明确服务方是否能控制用户资金。
- 如果收取交易抽成，需要评估支付服务监管风险。

### 10.3 建议合规边界

短期定位为：

- Open-source protocol + SDK
- Devnet demo
- Agent payment policy framework

避免短期定位为：

- Payments processor
- Custodial wallet
- Treasury manager
- Regulated money transmitter

## 11. 商业可行性

### 11.1 目标客户

优先 ICP：

1. Solana x402 API provider / data API provider
2. MCP server monetization team
3. AI agent framework builder
4. DAO / startup treasury automation team
5. Hackathon teams and early Solana apps that want agent-paid workflows

### 11.2 付费模式

| 模式                  | 描述                                    | 可行性 | 备注             |
| --------------------- | --------------------------------------- | -----: | ---------------- |
| Hosted dashboard SaaS | 多 agent、多 policy、alerts、logs       |   中高 | 最容易收 SaaS 费 |
| SDK / infra plan      | 高级 API、webhook、receipt verification |   中高 | 面向开发者       |
| Usage fee             | 按 agent payment volume 或请求数收费    |     中 | 需谨慎合规       |
| Enterprise self-host  | 私有部署、审计日志、团队权限            |     中 | 后期路线         |
| Public-good grant     | 开源基础设施资金                        |     中 | 可作为早期补充   |

### 11.3 价格假设

早期可测试：

- Free：1 agent、少量 receipt、dev mode。
- Pro：$20-50/月，更多 agents、hosted logs、webhooks。
- Team：$100-300/月，team policy、alerts、multisig owner。
- Enterprise：custom，self-host、audit exports、compliance hooks。

这些只是假设，必须通过访谈验证。

### 11.4 GTM 路径

第一阶段：黑客松和开发者社区

- 开源 repo。
- Demo video 展示 paid API + policy reject。
- 找 3-5 个 API/MCP provider 做 demo integration。
- 在 Solana、x402、Superteam、Colosseum 社区发技术帖。

第二阶段：SDK wedge

- 提供 `@agentguard/sdk`。
- 提供 Express middleware。
- 提供 paid API starter template。
- 提供 receipt verification helper。

第三阶段：Hosted control plane

- Dashboard 管理多个 agent。
- Spend alerts。
- Merchant reputation。
- Team approvals。
- Exportable receipts。

### 11.5 商业可行性结论

商业可行性是中高，但不是已验证。它的强项是：

- 市场叙事顺风。
- 用户痛点合理。
- 可通过开源 SDK 进入开发者生态。
- 有 SaaS dashboard 和 infra API 的自然延展。

它的弱项是：

- agentic payments 仍处早期。
- API provider 是否愿意付费未知。
- x402 工具链中可能出现原生 policy 功能。
- 钱包/embedded wallet 厂商也可能向下扩展。

## 12. 黑客松获奖可行性

按 Colosseum/Solana 黑客松逻辑评估：

| 维度                        |   分数 | 解释                                                        |
| --------------------------- | -----: | ----------------------------------------------------------- |
| Functionality               |    8.5 | MVP 路径明确，当前 program 已能 build；还需 e2e             |
| Potential Impact            |    9.0 | agentic payments 是强增长叙事，控制层是基础设施空白         |
| Novelty                     |    8.8 | 比 AI wallet 更具体，比 x402 demo 更有安全控制              |
| UX                          |    8.7 | agent 自动付款 + human Blink override 有明显 Solana UX 改善 |
| Open-source / Composability |    8.8 | SDK、program、receipt、Actions 都适合开源组合               |
| Business Plan               |    8.2 | SaaS/SDK/infra 路径清楚，但付费意愿未验证                   |
| Founder-fit                 |    9.2 | 高度匹配 Solana/Anchor/TS/React/Node/AI automation 能力     |
| 6-week feasibility          |    8.5 | 窄 MVP 可完成，完整平台不可完成                             |
| 综合判断                    | 8.7/10 | 推荐作为主项目                                              |

### 12.1 为什么它比普通 AI + Solana 更强

普通 AI + Solana 项目容易变成 chat UI、portfolio suggestion 或交易助手。AgentGuard 的差异在于：

- AI 不只是聊天，而是触发真实支付动作。
- Solana 不只是登录，而是执行 policy-enforced settlement。
- Demo 不只是生成建议，而是产生成功/失败的链上状态变化。

### 12.2 为什么评委容易理解

一句话评委理解：

> AI agents can now pay on Solana. AgentGuard is the spending firewall that makes it safe to give agents money.

3 分钟 video 可以用一个直观故事：

1. Agent 想买一份 paid data。
2. 裸钱包危险。
3. AgentGuard 给 agent 一个有预算的 vault。
4. 合法 payment 成功。
5. 超限 payment 失败。
6. Human 用 Blink 介入。

## 13. 实施计划

### 13.1 最短黑客松冲刺计划

#### Day 1-2：链上闭环

- 完成 test mint 创建脚本。
- 完成 e2e test：
  - initialize agent
  - deposit
  - add merchant
  - agent pay success
  - receipt created
  - over-limit failure
  - paused failure
- 增加 `withdraw` 或至少记录为已知缺口。

#### Day 3：SDK 和 agent client

- SDK 加 transaction builders。
- `agent-client.ts` 调 paid API。
- 处理 402 challenge。
- 发 `agent_pay`。
- retry API。

#### Day 4：API receipt verification

- demo API 从链上读取 receipt。
- 校验 requestHash、merchant、amount。
- 增加 replay/TTL 逻辑。

#### Day 5-6：Dashboard

- wallet connect。
- 创建 agent。
- deposit。
- add merchant。
- policy view/update。
- receipts table。

#### Day 7：Blink/Action

- `pause-agent` Action。
- 可选 `raise-limit` Action。
- Blinks Inspector 测试。

#### Day 8-9：视频和文档

- README 补完整 runbook。
- 架构图。
- pitch video。
- technical demo video。
- 部署 frontend 和 demo API。

### 13.2 6 周完整计划

| 周     | 目标                   | 交付                                              |
| ------ | ---------------------- | ------------------------------------------------- |
| Week 1 | Program 和本地 e2e     | 完整 Anchor tests、test mint、成功/失败路径       |
| Week 2 | SDK 和 x402-style flow | agent client、API challenge、receipt verification |
| Week 3 | Dashboard              | policy config、merchant、receipts、status         |
| Week 4 | Actions/Blinks         | pause、raise-limit、approve one-time path         |
| Week 5 | 安全和稳定性           | threat tests、error messages、indexing、logs      |
| Week 6 | Demo 和验证            | videos、README、deployment、用户访谈、submission  |

## 14. 风险登记表

| 风险                        |          概率 | 影响 | 等级 | 应对                                        |
| --------------------------- | ------------: | ---: | ---: | ------------------------------------------- |
| 被认为只是钱包限额          |            中 |   高 |   高 | demo 必须从 HTTP 402 agent payment 开始     |
| x402 集成耗时               |            中 |   中 |   中 | 做 x402-style mock，不做完整 facilitator    |
| 合约安全漏洞                |            中 |   高 |   高 | devnet only、完整失败测试、标注未审计       |
| 付费意愿不足                |            中 |   中 |   中 | 48 小时内访谈 API/MCP/agent builders        |
| Blink 兼容问题              |            中 |   中 |   中 | Blink 作为 P1，dashboard 保底               |
| dashboard 花太多时间        |            高 |   中 |   中 | UI 只做 demo 必需页面                       |
| Token-2022 scope creep      |            中 |   中 |   中 | MVP 只用 SPL Token，Token Extensions 后置   |
| 真实 USDC 合规风险          | 低短期/高中期 |   高 |   中 | 黑客松只用 devnet/test token                |
| 竞争者快速复制              |            中 |   中 |   中 | 强化 SDK、receipt standard、x402 middleware |
| 评委不熟悉 agentic payments |            中 |   中 |   中 | pitch 用“paid API + unsafe wallet”直觉场景  |

## 15. 用户验证计划

### 15.1 48 小时验证目标

继续开发前应尽快完成 6-10 个轻访谈：

- 3 个 API/MCP provider
- 3 个 agent builder
- 1-2 个 DAO/startup ops 用户
- 1-2 个 Solana developer 或 x402 builder

### 15.2 访谈问题

API/MCP provider：

1. 你是否考虑过 pay-per-call API？
2. 如果 AI agent 是调用方，你最担心什么？
3. 你需要服务端验证哪些付款信息？
4. 你愿意集成一个 receipt verification SDK 吗？
5. 你愿意为 hosted logs / webhooks / fraud controls 付费吗？

Agent builder：

1. 你会不会给 agent 钱包私钥？
2. 什么 policy 会让你敢让 agent 自动支付？
3. per-call cap、daily cap、merchant allowlist 哪个最重要？
4. 你希望 policy 在链上还是链下执行？
5. 你愿意为 agent spend logs 和 override dashboard 付费吗？

DAO / ops：

1. 当前小额支出如何审批？
2. 高频小额付款是否值得自动化？
3. 哪些付款必须 human approval？
4. receipt/export 对你是否重要？
5. 你愿意用 agent 自动支付 API、contractor、data source 吗？

### 15.3 Go / No-Go 标准

继续推进的条件：

- 至少 3 个访谈对象明确表示 agent spending control 是真实痛点。
- 至少 2 个访谈对象愿意试用 demo。
- 至少 1 个 API/MCP provider 愿意作为 demo merchant。
- 受访者能说出至少一个必须的 policy。

需要调整方向的信号：

- 大多数人只需要普通 x402，不需要 policy。
- 用户只愿意用钱包/embedded wallet 自带控制。
- API provider 不愿意验证链上 receipt。
- agent payment 场景仍太早，短期没有集成意愿。

## 16. MVP 验收标准

### 16.1 Program 验收

- `initialize_agent` 创建 profile 和 vault。
- `deposit` 后 vault token balance 增加。
- `add_merchant` 创建 merchant policy。
- `agent_pay` 成功时：
  - vault 减少；
  - merchant token account 增加；
  - receipt account 创建；
  - event emit。
- 超限付款失败，余额不变。
- 未授权 merchant 失败，余额不变。
- paused agent 失败，余额不变。
- wrong agent authority 失败。

### 16.2 API 验收

- 未付款请求返回 402。
- 402 body 包含完整 payment challenge。
- 成功 receipt 可解锁 API。
- 错误 receipt / wrong requestHash / amount too low 被拒绝。
- 重放请求有明确处理策略。

### 16.3 UX 验收

- 用户能看到：
  - vault balance；
  - agent status；
  - per-tx/daily limits；
  - allowlisted merchants；
  - receipt history；
  - failed payment reason。
- demo video 中评委能在 30 秒内理解产品。

## 17. 技术架构建议

### 17.1 推荐 monorepo 结构

当前结构合理：

```text
agentguard-protocol/
  apps/web/
  packages/sdk/
  programs/agentguard-protocol/
  services/x402-demo-api/
  docs/
  tests/
  scripts/
```

### 17.2 下一步建议新增文件

```text
scripts/create-test-mint.ts
scripts/seed-demo.ts
scripts/agent-client.ts
services/x402-demo-api/src/verifyReceipt.ts
apps/web/src/app/actions/pause/route.ts
apps/web/src/app/agents/page.tsx
apps/web/src/app/receipts/page.tsx
tests/agentguard-e2e.ts
```

### 17.3 Program 下一步建议

优先：

- 补 `deactivate_merchant`。
- 补 `withdraw`。
- 为 `PaymentReceipt` 增加 `nonce` 或更明确的 `request_hash` 域分离。
- 为 `agent_pay` 增加 merchant policy 与 merchant token account 的更强约束测试。

后置：

- `approve_one_time_payment`。
- session authority。
- Token-2022 metadata support。
- multisig owner。

## 18. Pitch 与叙事建议

### 18.1 不推荐叙事

不要说：

- “We built an AI wallet.”
- “We automate DeFi with agents.”
- “We are a payment app.”
- “We replace x402.”

### 18.2 推荐叙事

推荐说：

- “x402 lets agents pay. AgentGuard makes those payments safe.”
- “We are the policy firewall between autonomous agents and Solana funds.”
- “Give agents budgets, not private keys.”
- “Every autonomous payment should have a policy and a receipt.”

### 18.3 30 秒 pitch

```text
AI agents are starting to buy APIs, data, and on-chain services, but giving an agent a wallet is unsafe. AgentGuard is a Solana-native spending firewall for agentic payments. Owners fund a policy vault, set merchant allowlists and spend limits, and agents can only pay within those rules. In our demo, an agent calls a paid API, receives an HTTP 402 challenge, pays through AgentGuard, and unlocks the data. When the same agent tries to overspend, the Solana program rejects the payment before funds move. We make x402-style agent payments safe enough for real products.
```

## 19. 总体可行性评分

| 维度           |   评分 | 结论                                        |
| -------------- | -----: | ------------------------------------------- |
| 市场时机       |   9/10 | x402/agentic payments 官方化，时机强        |
| 用户痛点       |   8/10 | 痛点合理，需继续访谈                        |
| 技术可行性     | 8.5/10 | 窄 MVP 可完成，当前 repo 已有基础           |
| 安全可行性     |   7/10 | devnet demo 可控，生产需 audit              |
| 商业可行性     | 7.5/10 | 商业模型清楚，付费意愿待验证                |
| 黑客松获奖概率 | 8.7/10 | 强 Solana 原生性和 demo 表现力              |
| 团队/个人适配  |   9/10 | 高度匹配 Anchor/Rust/TS/React/AI automation |
| 综合           | 8.4/10 | 推荐推进                                    |

## 20. 最终结论

AgentGuard Protocol 具备较高可行性，尤其适合作为 Solana Frontier Hackathon 的主项目。它踩中了 2026 年 Solana 生态中的三个强信号：

1. agentic payments / x402 变成可用 primitive；
2. stablecoin/payment rails 在 Solana 上持续强化；
3. Colosseum 更偏好能跑通、能开源、能讲 startup wedge 的产品。

项目的正确打开方式是：**做一个窄而硬的 agent payment policy demo**，不要做大而全的 AI wallet。黑客松阶段只需要证明一件事：

> An autonomous agent can pay on Solana, but only when an on-chain policy allows it.

建议立刻推进下一阶段实现：

1. 完成 Anchor e2e 测试。
2. 完成 test mint 和 seed demo。
3. 完成 x402-style API receipt verification。
4. 完成 agent client。
5. 完成最小 dashboard。
6. 完成 Blink pause。
7. 用 6-10 个用户访谈验证付费意愿。

如果 48 小时内无法跑通 agent payment demo，则应立刻降级为更简单的 policy vault + paid API mock，不要继续扩展复杂功能。
