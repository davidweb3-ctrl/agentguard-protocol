# AgentGuard Protocol 多角色评估与项目决策纪要

日期：2026-05-03  
项目：AgentGuard Protocol  
评估对象：Solana Frontier Hackathon MVP  
输入文档：[FEASIBILITY_REPORT.md](./FEASIBILITY_REPORT.md)、[MVP.md](./MVP.md)、[ARCHITECTURE.md](./ARCHITECTURE.md)  
最终决策：**Go with strict MVP scope**

## 1. 决策摘要

多角色评审后的结论是：**继续推进 AgentGuard Protocol，并作为黑客松主项目提交，但必须锁定窄 MVP。**

最终目标不是做完整 AI wallet，也不是做完整 x402 facilitator，而是证明一个非常清晰的价值主张：

> AI agents can pay on Solana, but only when an on-chain policy allows it.

项目必须在 demo 中展示：

1. agent 请求 paid API；
2. API 返回 HTTP 402-style challenge；
3. agent 通过 AgentGuard `agent_pay` 付款；
4. program 在转账前执行 merchant allowlist、per-tx limit、daily limit、pause 检查；
5. 成功付款生成 receipt PDA；
6. 超限付款在资金转移前失败；
7. human 可以通过 dashboard 或 Blink 暂停/介入。

评审会同意：AgentGuard 的获奖概率高于 WorkSettle 或 AnchorShield 的前提是，demo 必须从 x402-style agent payment flow 开始，而不是从普通钱包 UI 开始。

## 2. 多角色设置

本次评估模拟 9 个角色，从不同角度对项目进行审查。

| 角色                            | 关注点                                                    | 决策权重 |
| ------------------------------- | --------------------------------------------------------- | -------: |
| Colosseum Judge                 | 黑客松获奖逻辑、impact、novelty、demo 清晰度              |       高 |
| Solana Protocol Engineer        | Anchor program、PDA、SPL token、Blinks 可实现性           |       高 |
| Smart Contract Security Auditor | 资金安全、权限边界、攻击面、测试要求                      |       高 |
| AI Agent Infrastructure Lead    | agentic payment flow、x402-style 集成、agent runtime 适配 |       高 |
| Product / UX Lead               | 3 分钟 demo、用户理解、dashboard 信息架构                 |     中高 |
| API Provider Customer           | API/MCP/data provider 是否愿意集成和付费                  |     中高 |
| Startup / VC Advisor            | 市场空间、商业模式、startup wedge、竞争风险               |     中高 |
| Growth / GTM Lead               | 初期用户获取、社区传播、pilot 访谈                        |       中 |
| Delivery PM                     | 时间、scope、里程碑、kill-switch                          |       高 |

## 3. 角色独立评估

### 3.1 Colosseum Judge

结论：**强 Go**

评分：

| 维度                        | 分数 |
| --------------------------- | ---: |
| Functionality               |  8.5 |
| Potential Impact            |  9.0 |
| Novelty                     |  8.8 |
| UX                          |  8.6 |
| Open-source / Composability |  8.8 |
| Business Plan               |  8.0 |
| Overall                     |  8.6 |

判断：

- 项目足够 Solana 原生，真实使用 Anchor、SPL token、PDA receipt、Actions/Blinks。
- 叙事贴合当前 Solana agentic payments / x402 方向。
- Demo 有天然戏剧性：合法付款成功，非法付款失败。
- 不依赖大型 BD、真实主网资金或复杂合规，适合小团队。

最大质疑：

- “这是不是只是 wallet spending limit？”

通过条件：

- Pitch 开头必须是 agent 调 paid API，而不是 owner 创建 wallet。
- 技术 demo 必须展示 HTTP 402 challenge 和 receipt verification。
- Demo 中必须有一个失败交易，证明 policy 是链上强制执行，不是前端提示。

### 3.2 Solana Protocol Engineer

结论：**Go，但需要补 e2e tests**

技术判断：

- 当前 program account model 合理：
  - `AgentProfile` 管 owner、agent authority、vault、limits；
  - `MerchantPolicy` 管商户白名单；
  - `PaymentReceipt` 管付款证明；
  - vault authority 使用 PDA，符合 Solana program 控制资金的常见模式。
- `agent_pay` 的核心路径可实现，且足够支撑 MVP。
- Anchor + SPL Token CPI 复杂度可控。

必须补齐：

1. 本地 test mint。
2. 完整 Anchor e2e：
   - initialize；
   - deposit；
   - add merchant；
   - successful agent pay；
   - receipt created；
   - over per-tx limit fail；
   - over daily limit fail；
   - paused fail；
   - wrong agent authority fail；
   - wrong merchant token owner fail。
3. SDK transaction builders。
4. `deactivate_merchant` 或在 README 明确 MVP 缺口。
5. `withdraw` 或在 README 明确 devnet-only 限制。

反对扩展：

- 不要在 MVP 中加入 swap。
- 不要加入复杂自然语言 policy。
- 不要引入 Token-2022 transfer hook 作为 P0。

### 3.3 Smart Contract Security Auditor

结论：**Conditional Go**

安全判断：

- 当前方案本质是受控 vault，属于资金相关合约，安全风险不能轻描淡写。
- 黑客松 demo 用 localnet/devnet token 可接受。
- 生产版本必须 audit，不能用“AI agent safe wallet”措辞暗示已适合主网资金。

P0 安全要求：

| 要求                                | 原因                                       |
| ----------------------------------- | ------------------------------------------ |
| 所有失败路径余额不变                | 证明 policy 在 transfer 前执行             |
| duplicate receipt request hash 测试 | 防止重复支付/重复解锁混乱                  |
| wrong merchant token owner 测试     | 防止付款到非预期收款账户                   |
| wrong mint 测试                     | 防止 vault 或 recipient token account 错配 |
| paused fail 测试                    | human override 必须真实有效                |
| README 标注未审计                   | 控制主网误用风险                           |

主要担忧：

- agent 私钥泄露后仍可在规则内花光预算。
- owner 私钥泄露后可以改策略。
- API challenge 如果未签名，agent 可能被 malicious merchant 诱导付款。

建议措辞：

- “spending firewall” 可以用。
- “safe enough for production” 在黑客松阶段慎用。
- “devnet demo, not audited for mainnet custody” 必须写清。

### 3.4 AI Agent Infrastructure Lead

结论：**Go，核心 demo 必须是 agentic workflow**

判断：

- x402-style flow 是项目的灵魂。
- 如果只做 dashboard + vault，项目会变成普通 wallet policy app。
- 如果 agent client 能自动处理 402、付款、retry，就能明显区分于普通支付工具。

P0 agent flow：

```text
GET /paid/weather-alpha
  <- 402 { amount, merchant, requestHash, mint, agentProfile }
agent builds agent_pay tx
program creates receipt PDA
GET /paid/weather-alpha with x-agentguard-receipt
  <- 200 paid data
```

必须交付：

- `scripts/agent-client.ts`
- receipt verification helper
- 至少一个 mock paid API endpoint
- 一段终端或 UI 录屏展示 agent 自动 retry

后置：

- 完整 x402 facilitator。
- MCP server plugin。
- 多 agent runtime integration。

### 3.5 Product / UX Lead

结论：**Go，但 UI 必须服务 demo，不做平台化 dashboard**

用户理解路径：

1. 这个 agent 有多少钱可以花？
2. 它能付给谁？
3. 每次最多能付多少？
4. 今天已经花了多少？
5. 哪些付款成功？
6. 哪些付款被挡住？
7. human 怎么立刻暂停？

MVP 页面建议：

| 页面      | 必须展示                                                 |
| --------- | -------------------------------------------------------- |
| Overview  | vault balance、agent status、daily spent、policy summary |
| Merchants | allowlisted merchant、cap、active 状态                   |
| Demo API  | request、402 challenge、pay、retry、response             |
| Receipts  | amount、merchant、request hash、tx signature、timestamp  |
| Controls  | pause/resume、update limits                              |

不要做：

- marketing landing page；
- 大面积解释性文案；
- 复杂 agent builder studio；
- 多 tab financial dashboard。

Demo UX 的 aha moment：

- 绿色：payment allowed，API unlocked。
- 红色：payment rejected before funds move。
- 蓝色：human override/pause through Blink。

### 3.6 API Provider Customer

结论：**Pilot Go，商业付费需验证**

API provider 角度的真实需求：

- 想要 pay-per-call，但不想管理用户账号和订阅。
- 想接受 agent 请求，但担心 abuse、refund、付款证明和链上确认。
- 希望收到的付款可对账、可验证、可追踪。

AgentGuard 对 API provider 的价值：

- receipt proof 可以作为服务端解锁条件。
- allowlist 让 provider 能要求付款来自受控 vault。
- hosted verification SDK 可以降低集成成本。

商业不确定性：

- API provider 可能只愿意集成标准 x402，不愿意依赖额外 protocol。
- 如果 x402 facilitator 已提供足够 verification，AgentGuard 需要证明 policy 层是新增价值。

验证问题：

1. 你愿意让 agent 按次购买你的 API 吗？
2. 你是否关心 payer 是否有预算/policy？
3. 你愿意在服务端校验 AgentGuard receipt 吗？
4. 你愿意为 hosted logs/webhooks/fraud controls 付费吗？

### 3.7 Startup / VC Advisor

结论：**Go，适合以 open-source infra wedge 进入**

投资视角：

- 方向贴合 agent commerce、machine payments、Solana payments 三个大趋势。
- MVP 能讲清楚“现在为什么需要这个”。
- 有从 hackathon demo 到 startup 的合理路径：
  - open-source program；
  - SDK；
  - Express/x402 middleware；
  - hosted policy dashboard；
  - enterprise/team spend controls。

商业路线建议：

| 阶段                 | 产品                                        | 收费                |
| -------------------- | ------------------------------------------- | ------------------- |
| Hackathon            | open-source program + demo                  | 无                  |
| Early devtool        | SDK + API middleware + receipt verifier     | 免费/开发者计划     |
| Hosted control plane | dashboard、logs、alerts、webhooks           | SaaS                |
| Team / enterprise    | self-host、multisig owner、policy templates | subscription/custom |

最大竞争风险：

- x402 tooling 原生加入 policy。
- embedded wallet / key infra 厂商向下做预算控制。
- 多签/treasury 工具向 agent automation 扩展。

护城河建议：

- 做好 `receipt standard` 和 SDK。
- 快速获得 2-3 个 demo merchant / MCP provider。
- 聚焦 Solana agentic payments，不做泛钱包。

### 3.8 Growth / GTM Lead

结论：**Go，但需要同步做用户验证**

GTM 不应等产品完成后才开始。黑客松期间就要做小规模验证。

48 小时行动：

- 联系 3 个 x402 / API / MCP builder。
- 联系 3 个 AI agent builder。
- 联系 2 个 Solana founder / Superteam builder。
- 争取 1 个 demo merchant。

内容传播角度：

- 技术帖标题：
  - “Give agents budgets, not private keys.”
  - “Policy vaults for x402 payments on Solana.”
  - “A spending firewall for autonomous agents.”
- Demo GIF：
  - agent gets 402；
  - payment succeeds；
  - overspend fails；
  - Blink pause。

最小 community proof：

- 3 条访谈 quote。
- 1 个 API provider 愿意试用。
- 1 个 Solana builder 愿意 star/fork 或复现。

### 3.9 Delivery PM

结论：**Go only if scope is frozen**

当前最大交付风险不是技术不可行，而是 scope creep。

Scope freeze：

P0 only:

- Anchor e2e。
- test mint。
- SDK builders。
- x402-style API。
- agent client。
- dashboard minimal。
- pause Blink。
- README + video。

Explicitly cut:

- swap。
- cross-chain。
- mainnet USDC。
- full facilitator。
- natural language policy。
- team permissions。
- Token Extensions。
- Agent Registry。
- merchant marketplace。

Kill-switch：

- 如果 24 小时内不能完成 token e2e，砍 dashboard。
- 如果 48 小时内不能完成 x402-style API，改成 CLI demo。
- 如果 Blink 卡住超过 1 天，改成 dashboard pause，Blink 放 optional。
- 如果 e2e 测试不稳定，不做 devnet live demo，改 local validator recorded demo。

## 4. 跨角色分歧与裁决

| 分歧                         | 支持方                      | 反对方                         | 裁决                                 |
| ---------------------------- | --------------------------- | ------------------------------ | ------------------------------------ |
| 是否做完整 x402 facilitator  | AI infra                    | Delivery PM、Protocol Engineer | 不做，做 x402-style mock flow        |
| 是否加入 Token-2022 metadata | Product、Protocol Engineer  | Delivery PM                    | 后置，不进 P0                        |
| 是否加入 one-time approval   | Security、Product           | Delivery PM                    | P2，只有 P0 完成后再做               |
| 是否做主网 USDC demo         | Startup Advisor             | Security Auditor、Delivery PM  | 不做，devnet/local only              |
| 是否强调 safe/secure         | Product                     | Security Auditor               | 用 spending firewall，不承诺主网安全 |
| 是否做漂亮 dashboard         | Product                     | Delivery PM                    | 只做 demo 必需 dashboard             |
| 是否做 `withdraw`            | Protocol Engineer、Security | Delivery PM                    | 建议 P1，若时间不足 README 标注限制  |

## 5. 加权决策矩阵

权重按黑客松短周期 + startup 潜力设置。

| 维度                  | 权重 | 评分 |   加权分 | 说明                           |
| --------------------- | ---: | ---: | -------: | ------------------------------ |
| Demo clarity          |  1.3 |  9.0 |     11.7 | 成功/失败付款很直观            |
| Solana-native value   |  1.3 |  9.2 |     12.0 | PDA、SPL、Blinks、x402-style   |
| Technical feasibility |  1.2 |  8.3 |     10.0 | P0 可实现，e2e 待补            |
| Novelty               |  1.1 |  8.8 |      9.7 | 比普通 AI wallet 更具体        |
| Security posture      |  1.1 |  7.2 |      7.9 | devnet demo 可控，生产需 audit |
| Market timing         |  1.1 |  9.0 |      9.9 | agentic payments 叙事强        |
| Business model        |  1.0 |  7.8 |      7.8 | SaaS/SDK 合理，付费待验证      |
| Founder-fit           |  1.0 |  9.2 |      9.2 | 技术栈高度匹配                 |
| Delivery risk         |  1.2 |  7.8 |      9.4 | scope 控制是关键               |
| 总分                  | 10.3 |    - | 87.6/103 | Go                             |

换算：**8.5/10，推荐推进。**

## 6. 最终项目决策

### 6.1 决策

**Go：继续推进 AgentGuard Protocol，作为黑客松主项目。**

### 6.2 决策条件

只有满足以下条件，项目才保持 Go：

1. 48 小时内跑通 `agent_pay` 成功路径和至少 2 个失败路径。
2. x402-style API demo 能展示 402 -> pay -> retry。
3. README 明确未审计、devnet/local only。
4. Demo 视频包含成功付款和超限拒绝。
5. 不新增 P0 之外功能。

### 6.3 核心产品定义锁定

锁定版本：

> AgentGuard is a Solana-native policy vault that lets AI agents pay for APIs through x402-style flows, while enforcing merchant allowlists, spend limits, receipts, and human override on-chain.

禁止偏移到：

- AI wallet；
- DeFi automation；
- treasury platform；
- generic payment link；
- x402 facilitator；
- smart account framework。

## 7. MVP Scope Lock

### 7.1 P0 必须交付

| 模块           | 交付物                             | 验收标准                                            |
| -------------- | ---------------------------------- | --------------------------------------------------- |
| Program        | `initialize_agent`                 | profile 和 vault 创建成功                           |
| Program        | `deposit`                          | vault 余额增加                                      |
| Program        | `add_merchant`                     | merchant policy 创建成功                            |
| Program        | `agent_pay` success                | vault 减少、merchant 增加、receipt 创建             |
| Program        | reject paths                       | unknown merchant、over limit、paused 失败且余额不变 |
| SDK            | PDA helpers + transaction builders | agent client 可调用                                 |
| API            | 402 challenge                      | 未付款返回 challenge                                |
| API            | receipt verification               | 成功 receipt 解锁 API                               |
| Agent client   | pay and retry                      | 自动完成 402 -> pay -> retry                        |
| UI             | minimal dashboard                  | 展示 policy、balance、receipts                      |
| Human override | pause action                       | dashboard 或 Blink 可暂停                           |
| Docs           | runbook                            | 评委可复现                                          |

### 7.2 P1 可选

- `withdraw`
- `deactivate_merchant`
- Blink pause
- deploy devnet
- one pilot merchant

### 7.3 P2/P3 后置

- one-time approval
- session vouchers
- Token-2022 metadata
- Agent Registry
- Squads owner
- full x402 facilitator
- MCP plugin
- merchant reputation

## 8. Go / No-Go 检查点

### 8.1 24 小时检查点

必须完成：

- local test mint；
- initialize/deposit/add merchant；
- `agent_pay` 成功；
- receipt 创建。

如果失败：

- 砍 dashboard；
- 砍 Blink；
- 专注 CLI + local validator demo。

### 8.2 48 小时检查点

必须完成：

- over-limit fail；
- paused fail；
- x402-style API 402 response；
- agent client 能提交付款；
- API retry 成功。

如果失败：

- 放弃完整 web demo；
- 改为 technical CLI demo；
- pitch 中说 web dashboard 是 next step。

### 8.3 提交前检查点

必须完成：

- 3 分钟 pitch video；
- 3 分钟 technical demo；
- README runbook；
- known limitations；
- devnet/local setup；
- final demo script；
- at least one visible Solana transaction or local validator account state proof。

## 9. RACI 分工建议

如果是个人参赛，下面角色由同一人按时间块切换。如果是小团队，可按表分工。

| 工作项             | Responsible      | Accountable | Consulted        | Informed |
| ------------------ | ---------------- | ----------- | ---------------- | -------- |
| Program e2e        | Solana Engineer  | Founder     | Security Auditor | PM       |
| Threat tests       | Security Auditor | Founder     | Solana Engineer  | PM       |
| SDK / agent client | AI Infra Lead    | Founder     | Solana Engineer  | Product  |
| x402-style API     | AI Infra Lead    | Founder     | API Provider     | PM       |
| Dashboard          | Product Lead     | Founder     | Solana Engineer  | GTM      |
| Blink pause        | Product Lead     | Founder     | Solana Engineer  | PM       |
| README / docs      | PM               | Founder     | All roles        | Judges   |
| Pitch video        | Product Lead     | Founder     | Startup Advisor  | All      |
| User interviews    | GTM Lead         | Founder     | Startup Advisor  | PM       |

## 10. 决策后的立即行动清单

### 10.1 Engineering next actions

1. 新建 `tests/agentguard-e2e.ts`。
2. 新建 `scripts/create-test-mint.ts`。
3. 新建 `scripts/seed-demo.ts`。
4. 为 SDK 增加 transaction builders。
5. 为 demo API 增加 `verifyReceipt.ts`。
6. 新建 `scripts/agent-client.ts`。
7. 加 `deactivate_merchant` 或明确推迟。
8. 加 `withdraw` 或明确推迟。

### 10.2 Product next actions

1. 写最终 demo script。
2. 设计 dashboard 最小页面：
   - overview；
   - policy；
   - merchants；
   - receipts；
   - demo API。
3. 准备 pitch video storyboard。
4. 准备 technical demo storyboard。

### 10.3 Validation next actions

1. 找 3 个 API/MCP provider 访谈。
2. 找 3 个 agent builder 访谈。
3. 找 1 个愿意做 demo merchant 的 provider。
4. 收集 3 条可放进 pitch 的用户 quote。

## 11. 最终共识声明

多角色评审会达成以下共识：

1. **项目应该继续做。**
2. **项目必须保持窄 MVP。**
3. **项目成败取决于 x402-style demo，而不是 dashboard 完整度。**
4. **安全测试必须优先于视觉 polish。**
5. **不要承诺主网安全，不要处理真实资金。**
6. **最强叙事是“给 agent 预算，而不是私钥”。**

最终决策：

> Proceed with AgentGuard Protocol as the primary hackathon submission. Build the smallest credible agentic payment control demo: policy vault, paid API, receipt, rejection, and human override.
