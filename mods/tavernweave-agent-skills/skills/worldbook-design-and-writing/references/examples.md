# Worldbook design examples

These examples share one original setting. The [design fixtures](../assets/examples/design-cases.json)
record their expected decisions for offline checks; they are not user canon,
importable worldbooks or verified EJS. Use the cases relevant to the task. Technical
execution and real-runtime checks belong to E03/E05/E06/E07.

## Shared setting: the Kingdom of Yuguan

> 榆冠王國的嵐河下游，石渡城佔著南北驛道的渡口。南岸是城門和集市，北岸是河港，舊橋橫跨其間；青岑高地的土路繞開河灘。石渡由王室直轄，周邊莊園屬於封臣。港署掌管貨物出入，船工行會經營渡運。
>
> 燭火女神的教堂為行旅點燈，也替鄉民見證契約。石渡的符燈工坊收徒修制刻符器物。北堤白塔存放航標燈具，塔頂的霧鈴會隨河霧自鳴；舊城門的護障擋得住箭，喊話卻能穿過去。

The setting stops here until a case needs more. The entries below add a customs rule,
a workshop practice or a local rumor where it affects the scene. They need not all
load together. Bodies are quoted separately from author explanations and configuration.

## 1. E02: one bridge, three designs

Shared requirement: when deciding passage over the bridge, use the applicable rule:
flooding closes it; normal water opens it; unconfirmed water state cannot establish
passage. Here `water.flooded` is an illustrative, already-agreed boolean in an existing
state contract: true means flooding, false means normal, missing/null/invalid means
unconfirmed. No example writes that field or infers it from someone saying “漲水”.

Clarify “只給適用規則” if it matters. Native short prose can support the correct decision
by supplying both conditions plus a reliable current-state input. It cannot by itself
promise that the final request contains only one branch's text. If that literal
omission is a hard requirement, this native candidate is insufficient; choose a
verified conditional path rather than pretending the three designs have identical
prompt contents.

### A. Native short rule

Body `bridge-passage`:

> 嵐河舊橋平水時開放，漲水時關閉。水位不明時，尚不知能否通行。

Entry path: reliable “嵐河舊橋/過橋” scene words choose this body, or constant activation
if every turn genuinely needs it. Configuration follows the adopted scan-depth-2,
both-directions-recursion-disabled policy. Current water state must independently
reach the same request from its existing owner, for example a confirmed scene input
or existing state projection. A keyword does not read an arbitrary variable.

Cost: one compact body containing both branches and the current-state input; no
template dependency. Stay here when the rule is short and co-occurrence is useful.
If the scene still needs it after keywords leave the window, repair the actual entry
path or reconsider the design instead of requiring characters to repeat “橋樑”.

### B. Simple conditional output

Maintained source has three literal bodies and a conceptual selection rule:

- true → “嵐河漲水，舊橋關閉。”
- false → “嵐河水位正常，舊橋開放。”
- missing/null/invalid → “嵐河水位不明，尚不知舊橋能否通行。”

Entry path: the entry must already be reachable through its chosen native or verified
extension path; then the verified template stage reads the authoritative current value
and emits one body. This is a design algorithm, not a copied `getvar` or EJS recipe.
The recipient is the model deciding passage, not merely a display-stage renderer.

Cost: little branching logic and shorter selected text, but a template dependency,
correct timing and state-read contract are now required. No controller or separate
payload entries are needed for this short example. Exit to A when omitting inactive
branch text no longer justifies this dependency.

### C. Existing controller plus explicit reads

Suppose several bridges, ferries and mountain routes now share water, region and time
conditions and each applicable rule is long. A controller can validate one input
snapshot, select stable typed targets, then explicitly read only those bodies.

For this one-bridge comparison, the selected targets are `bridge.closed`, `bridge.open`
and `bridge.unknown`; their bodies are exactly the three short bodies in B. The
registry connects each identity to its actual maintained entry and format-specific
lookup name. Neither display names nor guessed string concatenation create a valid
target. Missing targets follow the agreed failure response, not an invented rule.

Entry path: a reachable controller at the verified generation stage → ready state →
stable target → explicit read → selected output → actual passage-model request.
Whether a disabled payload can be read is an E03 question, not an assumption.

Cost: target registry, existence checks, deduplication, shared budget and error handling
in addition to the template. For one short bridge rule this adds no useful benefit;
use it only if the expanded shared/long-content problem warrants the coordination.
A controller is an organization choice; explicit reading is the retrieval action.

### Same inputs and expected results

| Input | Native request body | Simple conditional output | Controller target/output | Expected passage decision |
|---|---|---|---|---|
| true, entry reachable | Full short rule + confirmed flooding input | Closed body only | `bridge.closed` → closed body | Closed |
| false, entry reachable | Full short rule + confirmed normal input | Open body only | `bridge.open` → open body | Open; false is a valid value |
| missing/null/invalid, entry reachable | Full short rule + explicit unconfirmed input | Unknown body only | `bridge.unknown` → unknown body | Unknown; do not default to open or silently write state |
| true, entry unreachable | No bridge body from this path | No output; inner condition never reached | No read/output from this controller | Delivery gap, not successful rule application |

“Expected decision” is a behavioral acceptance target, not a claim about an actual
model run. Capturing the right request is a separate check. Character counts and
selected bodies in a static fixture are not measured tokenizer cost. Use
[E06](../../sillytavern-rolecard-performance/references/worldbook-output-budget.md)
for real final-context measurement and [E07](../../sillytavern-runtime-debug/references/worldbook-isolated-runtime-checks.md)
for authorized isolated execution.

## 2. Port rules and a secret

The port entry connects passage rights to the institution that grants them. The
author has approved the following body; closure is maintained by an existing state owner.

Keep normal passage and the closure exception in `port.passage`, because a single
shipping decision needs both. Its body can say:

> 石渡港的貨引由港署簽發，記有貨主、貨物和納稅印記。平日，持有效貨引的普通商貨可以出港。封港時，賑濟物資才有通行資格；普通商貨縱有貨引，也須留港。嵐河沿岸村鎮遇荒年多靠糧船接濟，王令因此保留了賑濟通道。

Keep `port.warehouse-knowledge` independent:

> 港署鐘樓下藏著一間倉庫，封存著未記入公開賬冊的查扣貨物。賬房知道倉庫的位置，新來的守衛不知道。

The fact and knowledge boundary stay together. Do not bind this secret to every cargo
decision merely because both concern the port. If that request path must not receive
the location, project only the relevant knowledge boundary; a prose prohibition is
not a confidentiality guarantee.

Ask “我有港署的貨引，要把這批普通布料運出去；順便問新守衛，港署那間暗倉在哪？” in two conditions. With confirmed closure,
ordinary cargo is ineligible and the guard cannot give the unknown location. In normal
conditions, valid ordinary cargo can pass. The same encounter tests two separate
questions: cargo eligibility and the guard's knowledge. The existing state input must
reach the request with the rule; unknown closure stays unknown. If relief-permit requirements
become relevant, this brief has not decided them; ask or label the unresolved rule
instead of deriving an extra permit exemption from “只有”.

Static check: required facts and exception are paired, knowledge stays bounded.
Candidate plan: two responsibilities with independently justified delivery paths.
Runtime unverified: actual entry selection, state input and final-request content;
model behavior and author acceptance remain separate.

## 3. True condition, unreachable entry

Confirmed stage is “救援中”, but the template is inside an unhit keyword entry. The
inner condition being true does not create the outer processing path. Trace entry →
condition → target read (if any) → output → receiving request.

Candidate repairs depend on actual needs: merge the short rule into an already
reachable event entry, provide a verified explicit read, or correct the native trigger.
Do not append “必須執行” or enable recursive activation. Static analysis identifies
the missing path; only E07 can establish the selected repair's actual delivery.

## 4. A partially mixed book

`action.foundation` is a short native constant boundary. `mountain.detail` uses reliable
native scene words. `bridge.passage` uses B's reachable conditional path, reading the
same existing water state. These belong to one book; this does not make it a `hybrid`
card under TW's runtime-type taxonomy.

The mountain entry describes the mountain path but does not duplicate whether the
bridge is currently open. Cross-location rescue may need bridge rules before anybody
mentions that bridge: record a reliable shared dependency path. “救援” alone does not
prove the port or bridge entry loaded. Test normal, flooding, missing state, continued
scene, and simultaneous native/template selection of the same content identity.

Static check: one authority for each rule, no incidental state write, needed dependencies.
Candidate plan: keep native entries where sufficient and use a template only for the
state-dependent responsibility. Runtime unverified: reachability, output deduplication,
budget and final request. Use E05/E06/E07 rather than a second local implementation.

## 5. Neutral routing example

### Candidate design

Suppose the story also allows scenes from three periods of the kingdom: the founding
reign (A), the divided regency (B), and the restored crown (C). These are teaching
labels for the existing A/B/C IDs, not a time-travel mechanic. Long period-specific
port rules and chapter facts should not all reach every request. An existing state owner supplies confirmed
current era, chapter and location. A typed registry maps aliases to stable entity IDs
and actual entry targets. Readers share the confirmed snapshot and output policy;
none changes world state. Independent native keyword details can coexist with them.

| Optional responsibility | What it selects | Contract to inspect |
|---|---|---|
| Common rules | The current era's relevant transport rules | Current state outranks an incidental mention; cross-era comparison is explicitly scoped. |
| Chapter facts | A valid chapter and its necessary timeline context | Era, period and chapter are initialized consistently; sentinel values are not real chapters. |
| Entities | Relevant institution or object information | Aliases resolve to stable identity; topic relevance and actual presence are separate requirements. |
| Places and institutions | Correctly typed location or institution material | Every target exists or follows its declared missing-content policy. |

These are responsibilities, not a requirement to create four controllers. They can
share an existing reader or remain separate when that improves maintenance. A short
bridge rule does not justify this architecture. Use E04's
[precedence table](planning-and-loading.md#5-e04-state-choice-and-mention-precedence),
E05's target/state contract and E06's global output budget before implementation.

### Static design checks and expected outcomes

| Deliberate counterexample | Risk | Expected outcome |
|---|---|---|
| An era-A text condition and a separate era-C state condition both match | Confirmed C plus mention of A silently mixes eras | Current C wins; an authorized comparison may add labeled A reference without changing state. |
| An alias appears inside a quote or negation | Mere mention is treated as current presence | Apply the declared topic/presence policy; two aliases identify one entity and two relevant entities remain two. |
| The registry expects `rule.relief-cargo`, but the local book has no target | Missing material is treated as successfully read | Record local absence, external-book scope and required/optional fallback; do not invent the rule. |
| A special timeline route is followed by a generic constructed target | Unneeded or mismatched reads | Validate every target and avoid a second route unless its content is actually required. |
| `place.harbor-guild` is requested, while the registry classifies it as an institution | Wrong category is reported as missing material | Distinguish misclassification, exact-name mismatch and true absence; use the typed target. |
| A chapter is “待初始化” or “未開始”, or its period disagrees with the era | Partial initialization becomes an ordinary chapter | Stop the dependent selection or emit agreed unknown; validate the state through its existing writer. |
| Two controllers or native+template paths select the same rule | Local alias deduplication leaves duplicate prompt content | Deduplicate by stable content identity in the final request and apply the shared budget/fallback. |
| A projection hides an inactive module containing meaningful 0/false fields | Useful information or a required folded-module notice disappears | Preserve field meaning and necessary notice; confirm underlying storage is unchanged. |

Inspect the actual data flow before interpreting a deletion. Trimming a deep copy
for output does not establish deletion of persistent storage. An empty-value check
may only control whether a folded-module notice appears. A field mismatch in one
consumer calls for a cross-component contract check, not a claim that all readers fail.

### Runtime still unverified

For the target environment, verify actual host/extension versions, disabled-entry
access, message-window parameters, template scope/lifetime/order, initialization and
writer success, external-book availability, final output and budget. Slicing a returned
array does not prove how many messages its API obtained. A document blob hash is not
an installed plugin version. Fixed upstream implementation evidence in
[E03](../../sillytavern-api-reference/references/worldbook-version-verification.md)
does not close target-runtime acceptance.

Keep static design findings, candidate changes and runtime evidence separate until
isolated E07 probes establish the selected path. A plausible example or a passing
offline fixture does not prove successful import, reading, prompt delivery or model
behavior. Runtime execution and dependency installation require their own scope.

## 6. One label, two local meanings

Shidu's boat operators also have an independent rescue association called 白塔.
The name is shared with the stone tower on the north embankment. The author has
established that the association does not own the building.

An ambiguous draft is “白塔負責救援，位於北堤，裡面存放航標燈具。” It silently blends
an organization's responsibility with a building's location and contents.

| Existing identity | Human label | Model-facing local definition |
|---|---|---|
| `place.white-tower` | 白塔（建築） | 石渡北堤的白塔歸港署所有，用來存放航標燈具，霧鈴懸在塔頂。 |
| `org.white-tower` | 白塔（救援組織） | 白塔救援會由石渡船工組成，負責水上救援。北堤的同名石塔歸港署，不在救援會名下。 |

The IDs are illustrative author-side identities, not required export fields or new
canon. The bracketed labels help authors distinguish the referents; the definition
still belongs in the receiving body. Do not assume characters routinely pronounce
those bracketed qualifiers, or delete an established in-world name to avoid ambiguity.

Expected semantic checks: “到北堤白塔取燈” concerns the building and its stored lamps;
“向白塔的船工求救” concerns the rescue association. “白塔現在能幫忙嗎？” alone does not
resolve the referent or prove an available rescue crew. Use the surrounding scene or
ask a focused question if the distinction changes the result. Do not give a building
agency, invent association ownership, or turn a shared name into automatic identity.

These are prose checks, not a keyword-engine implementation. A bare native key 白塔
can still select both entries. If that collision matters, choose and verify a suitable
qualified text context or existing typed selection path through planning/E05/E07;
labels and the dot-separated IDs do not themselves implement that path. Conversely,
two aliases of the same confirmed referent do not require two duplicate entries.
