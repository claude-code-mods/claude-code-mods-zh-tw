// Purpose: the text for the model (v0.11: moved here from rewrite.ts unchanged, docs/v0.11/plan.md): placeholders,
// notes, labels, lists, and the words of the fetch tool, in Chinese and English. Every platform and request format
// uses the same words; where a platform needs its own (Claude's notes after a message, Codex's compaction note), the
// function says so. The history of each wording is in the comments next to it.
// v0.1 — placeholders say the image was seen when it appeared and is left out now by the user's choice, so the model
// keeps trusting what it said about it (user report 2026-09-25).
// v0.1-14 — in the user's language (Codex's interface language, language.ts): the Chinese wording is the one tested on
// 2026-09-25; the English one says the same and is checked by the same self-test (v01-placeholder-selftest.ts --lang en).
// v0.1-24 — how to ask for an image back is spelled out, for every GPT-6 model (self-tests with CAM_TEST_MODEL).
// v0.1-25 — once anything is left out, each image still sent carries its id, and the note says a checked image is back
// in its old place: GPT-6 Luna looked for it in the newest message and said it could not see it (user 2026-09-28).
// v0.3 — automatic selection (user 2026-10-06): images from earlier turns that are not pinned are left out, in their own
// wording, and the model fetches what it needs with cam_view_image (whose words are here too, as text for the model).
// A copy it fetched is sent in that turn only. Drafts of this wording were tried on the three GPT-6 models in Chinese
// and English before it was built (spike/src/auto-fetch-selftest.ts).
// v0.8 (docs/v0.8/plan.md) — the model writes a feature line for each new image and notes the user's ratings, as record
// lines in its replies (notes.ts); a placeholder carries them, so the model still tells the images apart after a
// compaction. For that a feature line note goes before the turn of the first image, and every image sent says its id,
// also the ones new in this turn. The second line of a placeholder is shorter, offsetting the added text.
// Input: what is known of an image (Described), the language. Output: strings.

import { FETCHED_STATE, type ImageKind } from "./images.ts";
import type { Lang } from "./lang.ts";
import type { Notes, Rating } from "./notes.ts";

// notes (v0.8): what the model noted about the image, shown in its placeholder. awaiting (v0.10): an image of an
// interrupted turn sent once more for its feature line (thread-index.ts, awaitingLine); its label says so.
export type Described = { id: string; name: string | null; label: string | null; kind: ImageKind; turn: number | null; width: number | null; height: number | null; notes?: Notes; awaiting?: boolean };

type FetchWords = { title: string; description: string; ids: string; missing: (id: string) => string; unavailable: (id: string) => string; off: string };
type Words = {
  kind: Record<ImageKind, string>; unnamed: string; turn: (n: number) => string; thisTurn: string; newImage: string;
  // v0.10: the source in a compact line (compactLine), shorter.
  kindShort: Record<ImageKind, string>; sameShort: (id: string) => string;
  omitted: string; notRepeated: string; included: string; separator: string;
  // v0.10: the label of an image sent once more for its feature line (Described.awaiting).
  includedAwaiting: string;
  heading: (id: string, label: string | null, state: string, fields: string[]) => string;
  plain: (id: string) => string; duplicate: (id: string, where: string) => string; note: string;
  autoPlain: (id: string) => string; autoNote: string; copy: (id: string) => string; fetch: FetchWords;
  // v0.4, Claude Code only (anthropic-messages/rewrite.ts): what the note adds about tool results, and the short note that follows
  // each message holding omitted images, naming them.
  toolNote: string; here: (list: string) => string; hereAuto: (list: string) => string; listItem: (id: string, name: string | null, kind: string) => string;
  // v0.5, Claude Code only: after a compaction summary, the images from before it, which of them are not sent this
  // time, and how to get one back. v0.10: how many and their ids, no longer listed; those not sent are one line each
  // in a list after the summary (compactHeader, compactLine).
  compacted: (count: number, range: string, missing: number, auto: boolean) => string;
  compactHeader: (count: number) => string;
  // v0.10, Codex: the images its compaction did not keep, put back after it: how many, how many sent as originals.
  codexCompacted: (count: number, resent: number, auto: boolean) => string;
  // v0.8: how to write feature lines and note ratings; the placeholder's line with them; how long each may be shown.
  featureNote: string; notes: (line: string | null, ratings: Rating[]) => string;
};

// The image sits in the history, so the model concludes it never saw it and takes back what it said about it (user
// report 2026-09-25). Saying otherwise inside the placeholder did not help: it is user content, which the model does
// not take as proof. So the explanation goes once into a developer message, before the turn where the first omitted
// image appeared, and each placeholder only points to it.
const WORDS: Record<Lang, Words> = {
  zh: {
    kind: { upload: "使用者上傳", view: "工具檢視的圖片", generated: "生成的圖片", tool: "工具結果裡的圖片" },
    kindShort: { upload: "上傳", view: "檢視", generated: "生成", tool: "工具" },
    sameShort: (id) => `同 ${id}`,
    unnamed: "未命名",
    turn: (n) => `第 ${n} 輪`,
    thisTurn: "本輪",
    newImage: "（新圖片）",
    omitted: "已省略",
    notRepeated: "未重複提供",
    included: "已提供",
    includedAwaiting: "已提供，還沒有特徵行",
    separator: "，",
    heading: (id, label, state, fields) => `[圖片 ${id}${label ? `（${label}）` : ""} ${state}｜${fields.join("｜")}]`,
    // v0.8: shorter; the context management note says why the image is left out (it was "原圖被使用者省略以節省上下文，情況
    // 見前面的“上下文管理說明”；需要重新看這張圖時，在回覆裡寫出“需要 IMG-xxx”。").
    plain: (id) => `需要重看時，在回覆裡寫“需要 ${id}”。`,
    duplicate: (id, where) => `這張圖和 ${id}（${where}）內容完全相同，那一條在本次請求裡照常提供，請直接參考那一條。`,
    note: [
      "上下文管理說明（來自使用者安裝的上下文素材管理工具）：為了節省上下文，使用者取消勾選了這個任務裡的部分圖片。後面的對話裡，這些圖片原來的位置被換成了“[圖片 IMG-xxx 已省略…]”這樣的佔位文字；仍在提供的圖片前面標著“[圖片 IMG-xxx 已提供…]”，緊接著就是原圖。",
      "這些圖片在它們出現的那一輪真實存在，你當時收到並看過；你之前對它們的描述，以及據此做出的判斷，都是看著原圖做出的，仍然有效。不要因為現在看不到，就認為之前的回答是猜測或錯誤，也不要收回或道歉。",
      "被問到現在能不能看到某張被省略的圖片時，如實說明現在看不到（被使用者省略了），並說明之前的描述仍然有效。現在看不到畫面，就不要補充之前沒說過的細節。需要重新看某張圖時，在回覆裡原樣寫出“需要 IMG-xxx”（幾張就寫“需要 IMG-002、IMG-003”）：工具靠這幾個字認出你要的圖。使用者重新勾選後，原圖會回到它在對話裡原來的位置：那裡的佔位文字換成“[圖片 IMG-xxx 已提供…]”和原圖；它不會出現在使用者的新訊息裡，所以不要讓使用者重新上傳或附上圖片。不要自己用工具去讀取這些圖片。",
      "標著“[圖片 IMG-xxx 已提供…]”的圖片現在就在你面前，即使它之前被省略過、或者正是你要過的圖：被問到它時，直接看圖回答，不要說看不到。",
    ].join("\n"),
    autoPlain: (id) => `需要原圖時呼叫 cam_view_image，傳入“${id}”。`,
    // 2026-11-01, long-task eval (Haiku 5.5, effort low): after a compaction the model stopped reading the files the
    // user named, five turns running ("沒有收到圖片內容，只有文字說明"): "do not read image files with other tools" was
    // taken for every image. It now says the omitted ones, and that new images are looked at as usual.
    autoNote: [
      "上下文管理說明（來自使用者安裝的上下文素材管理工具）：這個任務開著“自動選圖”。為了節省上下文，之前各輪的圖片預設不再隨請求提供，後面的對話裡，它們原來的位置換成了“[圖片 IMG-xxx 已省略…]”這樣的佔位文字；本輪新出現的圖片照常提供，使用者固定傳送的圖片也照常提供，前面標著“[圖片 IMG-xxx 已提供…]”，緊接著就是原圖。",
      "這些圖片在它們出現的那一輪真實存在，你當時收到並看過；你之前對它們的描述，以及據此做出的判斷，都是看著原圖做出的，仍然有效。不要因為現在看不到，就認為之前的回答是猜測或錯誤，也不要收回或道歉。",
      "回答需要看某張被省略的圖片、而你之前說過的內容不夠用時，呼叫 cam_view_image 工具，傳入它的編號（幾張就一次傳幾個），原圖會出現在這次的工具結果裡，前面標著“[圖片 IMG-xxx 取回的原圖…]”，拿到後看圖回答。之前說過的內容夠用時，不要呼叫。現在看不到的畫面細節，不要猜測或補充；不要讓使用者重新上傳圖片，也不要用其他工具去讀取這些被省略的圖片的檔案；使用者新讓你看的圖片不受影響，照常去看。",
      "用 cam_view_image 取回的圖片只在本輪提供，下一輪又會換回佔位文字；之後還需要時，再呼叫一次。標著“已提供”或“取回的原圖”的圖片現在就在你面前：被問到它時，直接看圖回答，不要說看不到。",
    ].join("\n"),
    copy: (id) => `[${id} 的原圖：模型當時用 cam_view_image 取回，只在那一輪提供，現在已省略]`,
    // v0.4: in Claude Code desktop tests (Haiku 5.5, 2026-10-09) the model read a placeholder inside a Read result as
    // what the tool had returned, said it had never seen the image and took back its correct description; the same
    // words inside the tool result were not believed ("I should not follow the placeholder"). With the note right after
    // the message holding the image, it answered as intended. So each such message is followed by a short note.
    // 2026-10-10, Haiku 5.5, tool images, 3 runs per language: it kept its answers and guessed nothing, but asked for
    // the image by number in 2 of 3 Chinese runs (as an option) and in no English run; a question about a detail it
    // never described got "I can't answer that". The note now says when to write "需要 IMG-xxx", and why.
    toolNote: "工具結果裡的圖片也一樣：那次工具呼叫當時返回的是原圖，你當時看到了；工具結果裡的佔位文字是後來才換上的，不是工具當時的返回。",
    here: (list) => `上下文管理說明：上面這條訊息裡的 ${list} 當時是原圖，你當時看過；你之前對它們的描述和據此做出的判斷仍然有效，不要收回，也不要說成是猜測或編造。那裡的佔位文字是這次請求才換上的，不是當時的內容。現在你看不到它們：被問到時，如實說現在看不到（被使用者省略了），不要補充之前沒說過的細節。問題得看其中某張圖才能回答時，不要只說答不了，在回覆裡單獨寫一行“需要 IMG-xxx”（寫出編號，幾張就都寫上）：使用者看到這一行才知道該勾回哪張圖，勾回後原圖回到原處，你就能看著回答。`,
    hereAuto: (list) => `上下文管理說明：上面這條訊息裡的 ${list} 當時是原圖，你當時看過；你之前對它們的描述和據此做出的判斷仍然有效，不要收回，也不要說成是猜測或編造。那裡的佔位文字是這次請求才換上的（自動選圖），不是當時的內容。之前說過的內容不夠用時，呼叫 cam_view_image 取回原圖；不要補充之前沒說過的細節。`,
    listItem: (id, name, kind) => `${id}（${[name, kind].filter(Boolean).join("，")}）`,
    // 2026-10-12, Haiku 5.5: while this note sat inside the user message holding the summary, unchecking an image that
    // had been sent again made the model take back what it had said looking at it ("沒有依據的數字，應當撤回") and ask
    // for it to be provided again, also once the note named it and said not to. Like v0.4's notes, it now follows that
    // message as a system message, after the full note when something is left out (compactedNote). Same test, with all
    // checked again: the model looked for the image it had asked for in the user's new message ("這次訊息裡沒有附上"),
    // as GPT-6 Luna did in v0.1-25; with nothing left out the full note is not there to say where it comes back. Once it
    // answered from it, it called its earlier "需要 IMG-001" a mistake ("一直在我的上下文裡"), in both languages.
    compacted: (count, range, missing, auto) => [
      `${missing === 0 ? "上下文管理說明（來自使用者安裝的上下文素材管理工具）：" : "上下文管理說明："}上面這條訊息裡，摘要之前的對話中有 ${count} 張圖片（${range}）。壓縮對話時它們被移出了上下文；這個工具把它們放回了摘要後面：使用者${auto ? "固定傳送" : "勾選要傳送"}的那些前面標著“[圖片 IMG-xxx 已提供…]”，緊接著就是原圖，它們現在就在你面前，被問到時直接看圖回答，不要說看不到。${missing === 0 ? `即使它之前被省略過${auto ? "" : "、或者正是你要過的圖"}，也是這樣：使用者${auto ? "固定傳送" : "勾回"}的圖回到這裡，不會出現在使用者的新訊息裡，不要讓使用者重新附上。` : ""}這一段是這個工具每次請求時重新放的：圖被省略的那些請求裡，這裡並沒有它；它現在出現在你之前的回覆前面，只是因為這次放了回來。所以你之前說看不到哪張圖，當時是實情，不是錯誤，不用糾正。`,
      ...(missing === 0 ? [] : [
        `${missing < count ? "其餘" : "這"} ${missing} 張這次沒有附原圖（${auto ? "自動選圖開著，之前各輪的圖預設不發" : "使用者取消了勾選"}，為了節省上下文）：它們在摘要後面的清單裡，一張一行，寫著編號、名稱和你當時記下的特徵與評價，清單是這次請求才放上的。你之前看過它們的原圖：在壓縮之前的對話裡，有的在壓縮之後也提供過；你對它們的描述和據此做出的判斷，不管是在摘要裡還是在後面的回覆裡，都是看著原圖做出的，仍然有效，不要收回，也不要說成是猜測或編造。${auto ? "現在你看不到它們，不要補充之前沒說過的細節。" : "現在你看不到它們：被問到時，如實說現在看不到（被使用者省略了），不要補充之前沒說過的細節。"}`,
        auto
          ? "之前說過的內容不夠用時，呼叫 cam_view_image 工具，傳入編號取回原圖；不要讓使用者重新上傳。"
          : "問題得看其中某張圖才能回答時，不要只說答不了，在回覆裡單獨寫一行“需要 IMG-xxx”（寫出編號，幾張就都寫上）：使用者看到這一行才知道該勾回哪張圖，勾回後原圖回到它的位置，你就能看著回答；不要讓使用者重新上傳或重新提供。",
      ]),
    ].join("\n"),
    compactHeader: (count) => `[壓縮之前的圖片，這次沒有附原圖的 ${count} 張：編號｜名稱｜來源｜輪次｜特徵和評價]`,
    codexCompacted: (count, resent, auto) => [
      `上下文管理說明（來自使用者安裝的上下文素材管理工具）：這個任務壓縮過對話。壓縮時，之前各輪裡工具檢視、生成或返回的 ${count} 張圖片沒有保留下來，這個工具把它們放回了這裡。`,
      resent ? `其中使用者${auto ? "固定傳送" : "勾選要傳送"}的 ${resent} 張，原圖就在後面，前面標著“[圖片 IMG-xxx 已提供…]”：它們現在就在你面前，被問到時直接看圖回答，不要說看不到。` : null,
      count > resent ? `${resent ? "其餘" : "這"} ${count - resent} 張這次沒有附原圖（${auto ? "自動選圖開著，之前各輪的圖預設不發" : "使用者取消了勾選"}，為了節省上下文），在下面的清單裡一張一行，寫著編號、名稱和你當時記下的特徵與評價。` : null,
      "這些圖片在它們出現的那一輪真實存在，你當時看過；你之前對它們的描述，以及據此做出的判斷，都是看著原圖做出的，仍然有效，不要收回，也不要說成是猜測或編造。現在看不到原圖的，不要補充之前沒說過的細節。",
      count > resent
        ? auto
          ? "回答需要看清單裡的某張圖、而你之前說過的內容不夠用時，呼叫 cam_view_image 工具，傳入它的編號（幾張就一次傳幾個），原圖會出現在這次的工具結果裡；不要讓使用者重新上傳，也不要用其他工具去讀取清單裡這些圖片的檔案；使用者新讓你看的圖片不受影響，照常去看。"
          : "問題得看清單裡某張圖才能回答時，在回覆裡單獨寫一行“需要 IMG-xxx”（寫出編號，幾張就都寫上）：使用者勾回後，原圖會回到這裡；不要讓使用者重新上傳。"
        : null,
    ].filter((line) => line !== null).join("\n"),
    fetch: {
      title: "檢視被省略的圖片",
      description: "檢視這個任務裡一張或幾張被省略的圖片的原圖。被省略的圖片在對話裡顯示為“[圖片 IMG-xxx 已省略…]”。只在回答需要看圖、而你之前對它說過的內容不夠用時呼叫；取回的原圖只在本輪提供。",
      ids: "要檢視的圖片編號，例如 [\"IMG-004\"]；幾張就一次傳幾個。",
      missing: (id) => `這個任務裡沒有 ${id}。`,
      unavailable: (id) => `${id} 的原圖讀不出來。`,
      off: "這個任務沒有開自動選圖：被省略的圖片要由使用者勾選。需要時在回覆裡寫“需要 IMG-xxx”。",
    },
    // v0.8, the wording the user approved on 2026-10-19 (docs/v0.8/plan.md). Revised the same day: it says why the user
    // installed the tool and no longer that the user "does not know" (Haiku 5.5 read that as an injection), and that a
    // rating needs no "記下了" (sol said so). Then the lines open the reply: Claude Desktop shows a link definition that
    // ends the latest reply; and a rating is noted even when the model disagrees (Haiku asked first, "確認後我再記下").
    // Then a bare rating gets a short reply about itself (Haiku explained what it noted, luna said nothing), and a turn
    // with nothing to note gets no lines (Haiku wrote an empty one). 2026-10-21 (user): the first part is the place, not
    // the "scene": in a user's MV task GPT-6 read 場景 as a film scene and named it after the scene number and what the
    // image was for ("04場店外線稿", "04場店外區域性核對"), 28 scenes for 52 images.
    featureNote: [
      "特徵行說明（來自使用者安裝的上下文素材管理工具）：這個任務裡的每張圖都有編號，寫在圖前面的“[圖片 IMG-xxx …]”裡。使用者裝這個工具，是為了讓你以後（包括對話壓縮之後）還能認出每張圖、記得使用者對它們的評價。所以請在每一輪最後那條回覆的開頭（不要寫在中途呼叫工具時說的話裡），先給這一輪新出現的每張圖寫一行特徵，空一行再寫正文，格式是：",
      "[//]: # (cam IMG-015 地點｜看得見的特徵)",
      "- 先寫地點，再寫看得見的特徵（景別、主體、角度、光線、顏色、構圖），一共 30 字以內，例如“[//]: # (cam IMG-015 街頭｜近景，正臉，雨夜，霓虹反光)”。",
      "- 地點寫這張畫面發生在哪兒，具體到能和別處分開，比如“書房”“咖啡店外”“地鐵站臺”；特寫看不出來時，按你知道的寫。場次編號、版本、用途（首幀、線稿、檢查圖之類）都不寫進地點；時間、天氣寫在後面的特徵裡。",
      "- 一張圖裡有好幾個地點的（分鏡、抽幀拼圖）寫“多個地點”；不在任何地方的，寫它是什麼：角色、物品、文件、網頁。",
      "- 同一個地點沿用你之前用過的叫法。",
      "- 只寫看得見的東西，不寫“好看”“像誰”這類判斷。每張圖只寫一次，以後不改。使用者上傳的、你生成的、你檢視的、工具返回的圖都要寫；用 cam_view_image 取回的圖和沒有編號的圖不用寫。",
      "- 標著“[圖片 IMG-xxx 已提供，還沒有特徵行…]”的圖，是之前那一輪被打斷、沒來得及寫特徵行的，這一輪再提供一次：也給它寫一行。",
      "- 寫過的特徵行有錯（比如使用者指出了），照同樣的格式整行重寫，開頭加“更正：”，例如“[//]: # (cam IMG-005 更正：角色｜正面近景，左眉有疤)”，它會替換原來那一行。",
      "- 使用者評價某張圖時（包括隔了幾輪才說），先確定是哪一張，再照使用者的原話記一行，15 字以內，例如“[//]: # (cam IMG-003 評價：太暗)”。評價是使用者自己的看法，你不認同也照記。拿不準是哪一張就不記，可以在正文裡問使用者指的是哪一張，但不要提記錄的事。使用者只是評價、沒有提要求時，正文簡短回應評價本身就行，不要說明你記了什麼、對應到了哪張圖。",
      "- 這些行寫在正文前面，和正文之間空一行，一張圖寫一行；括號裡不要用半形括號。這一輪沒有新圖、也沒有評價時，不寫這些行。這些行只給這個工具讀，使用者在介面上看不到。正文照常回答，不用提到這些行；使用者評價圖片時，也不用回應記錄這件事，比如“記下了”“我會記住”“之後會參考”。",
      "- 以後被省略的圖，佔位裡會帶著你寫的特徵和記下的評價，對話壓縮之後也還在。要選圖時先看這些；拿不準時，先把原圖要回來看（怎麼要，見“上下文管理說明”），或者問使用者是哪一張。",
    ].join("\n"),
    notes: (line, ratings) => [
      line ? `特徵：${line}` : null,
      ratings.length ? `評價：${ratings.map((rating) => `${rating.turn !== null ? `第 ${rating.turn} 輪` : ""}“${rating.text}”`).join("，")}` : null,
    ].filter((part) => part !== null).join("；"),
  },
  en: {
    kind: { upload: "uploaded by the user", view: "viewed with a tool", generated: "generated image", tool: "image from a tool result" },
    kindShort: { upload: "upload", view: "viewed", generated: "generated", tool: "tool" },
    sameShort: (id) => `same as ${id}`,
    unnamed: "unnamed",
    turn: (n) => `turn ${n}`,
    thisTurn: "this turn",
    newImage: "(new image)",
    omitted: "omitted",
    notRepeated: "not repeated",
    included: "included",
    includedAwaiting: "included, no feature line yet",
    separator: ", ",
    heading: (id, label, state, fields) => `[Image ${id}${label ? ` (${label})` : ""} ${state} | ${fields.join(" | ")}]`,
    plain: (id) => `To see it again, write "need ${id}" in your reply.`,
    duplicate: (id, where) => `This image is identical to ${id} (${where}), which is included in this request as usual; refer to that one.`,
    note: [
      "Context management note (from the context asset manager the user installed): to save context, the user unchecked some images in this task. Further on in the conversation, where those images were, there is now placeholder text such as \"[Image IMG-xxx omitted…]\"; each image still included is marked \"[Image IMG-xxx included…]\", with the original image right after it.",
      "These images really existed in the turn where they appeared, and you received and looked at them then; what you said about them before, and the judgments you based on it, were made looking at the original images and remain valid. Do not treat your earlier answers as guesses or mistakes because you cannot see the images now, and do not take them back or apologize.",
      "If asked whether you can see an omitted image now, say truthfully that you cannot see it now (the user left it out), and that your earlier descriptions remain valid. Since you cannot see it now, do not add details you did not mention before. If you need to look at an image again, write exactly \"need IMG-xxx\" in your reply (for several: \"need IMG-002, IMG-003\"): the tool finds the images you want by these words. Once the user checks an image again, its original is back in its old place in the conversation: the placeholder there becomes \"[Image IMG-xxx included…]\" followed by the original image. It does not come in the user's new message, so do not ask the user to upload or attach it again. Do not read these images yourself with tools.",
      "An image marked \"[Image IMG-xxx included…]\" is in front of you now, even if it was omitted before or is one you asked for: when asked about it, look at it and answer from it, and do not say you cannot see it.",
    ].join("\n"),
    autoPlain: (id) => `For the original, call cam_view_image with "${id}".`,
    autoNote: [
      "Context management note (from the context asset manager the user installed): this task has automatic image selection on. To save context, images from earlier turns are no longer included in requests by default: further on in the conversation, where those images were, there is now placeholder text such as \"[Image IMG-xxx omitted…]\". Images new in this turn are included as usual, and so are the images the user pinned, marked \"[Image IMG-xxx included…]\" with the original image right after it.",
      "These images really existed in the turn where they appeared, and you received and looked at them then; what you said about them before, and the judgments you based on it, were made looking at the original images and remain valid. Do not treat your earlier answers as guesses or mistakes because you cannot see the images now, and do not take them back or apologize.",
      "When an answer needs an omitted image and what you said about it before is not enough, call the cam_view_image tool with its id (several ids at once if you need several); the original comes back in that tool result, marked \"[Image IMG-xxx fetched original…]\", and you answer from it. When what you said before is enough, do not call it. Do not guess or add visual details you cannot see now; do not ask the user to upload images again, and do not read the files of omitted images with other tools. Images the user newly asks you to look at are not affected: look at them as usual.",
      "An image you get with cam_view_image is included only in this turn; from the next turn on it is a placeholder again. Call the tool again if you need it later. An image marked \"included\" or \"fetched original\" is in front of you now: when asked about it, look at it and answer from it, and do not say you cannot see it.",
    ].join("\n"),
    copy: (id) => `[Original of ${id}: fetched by the model with cam_view_image, included only in that turn, now omitted]`,
    toolNote: "The same holds for images in tool results: the tool call returned the original image at the time and you saw it; a placeholder inside a tool result was put there later, it is not what the tool returned.",
    here: (list) => `Context management note: in the message above, ${list} were original images at the time, and you looked at them then; what you said about them and the judgments you based on it remain valid, so do not take them back or call them guesses or made up. The placeholder text there was put in only for this request; it is not what was there at the time. You cannot see them now: if asked, say so truthfully (the user left them out), and do not add details you did not mention before. When a question can only be answered by looking at one of them, do not just say you cannot answer; write a line "need IMG-xxx" in your reply (with its number; list each one needed): that line is how the user learns which image to check again, and once they do, the original comes back in its place and you can answer from it.`,
    hereAuto: (list) => `Context management note: in the message above, ${list} were original images at the time, and you looked at them then; what you said about them and the judgments you based on it remain valid, so do not take them back or call them guesses or made up. The placeholder text there was put in only for this request (automatic image selection); it is not what was there at the time. When what you said before is not enough, fetch the original with cam_view_image; do not add details you did not mention before.`,
    listItem: (id, name, kind) => `${id} (${[name, kind].filter(Boolean).join(", ")})`,
    compacted: (count, range, missing, auto) => [
      `${missing === 0 ? "Context management note (from the context asset manager the user installed): " : "Context management note: "}in the message above, the conversation before the summary had ${count} images (${range}). Compacting the conversation took them out of context; this tool put them back right after the summary: the ones the user ${auto ? "pinned" : "checked to send"} are marked "[Image IMG-xxx included…]" with the original image right after it. They are in front of you now: when asked about one, look at it and answer from it, and do not say you cannot see it.${missing === 0 ? ` This holds even for an image omitted before${auto ? "" : " or one you asked for"}: an image the user ${auto ? "pins" : "checks again"} comes back there, not in the user's new message, so do not ask for it to be attached again.` : ""} This tool rebuilds this part for every request: in the requests where an image was left out, it was not here; it shows up before your earlier replies now only because it was put back for this request. So if you said before that you could not see an image, that was true then, not a mistake; do not correct it.`,
      ...(missing === 0 ? [] : [
        `${missing < count ? "The other" : "These"} ${missing} are not included as originals this time (${auto ? "automatic image selection is on, so images from earlier turns are left out by default" : "the user unchecked them"}, to save context): they are in the list after the summary, one line each, with the id, name, and the features and ratings you noted; the list was put there only for this request. You saw their originals: in the conversation before the compaction, and some also after it. What you said about them and the judgments you based on it, in the summary or in your later replies, were made looking at the original images and remain valid; do not take them back or call them guesses or made up. ${auto ? "You cannot see them now, so do not add details you did not mention before." : "You cannot see them now: if asked, say so truthfully (the user left them out), and do not add details you did not mention before."}`,
        auto
          ? "When what you said before is not enough, call the cam_view_image tool with the id to fetch the original; do not ask the user to upload it again."
          : "When a question can only be answered by looking at one of them, do not just say you cannot answer; write a line \"need IMG-xxx\" in your reply (with its number; list each one needed): that line is how the user learns which image to check again, and once they do, the original comes back in its place and you can answer from it. Do not ask the user to upload or provide it again.",
      ]),
    ].join("\n"),
    compactHeader: (count) => `[Images from before the compaction, the ${count} not included as originals this time: id | name | source | turn | features and ratings]`,
    codexCompacted: (count, resent, auto) => [
      `Context management note (from the context asset manager the user installed): this task's conversation was compacted. The compaction did not keep ${count} images that tools viewed, generated or returned in earlier turns; this tool put them back here.`,
      resent ? `Of them, the ${resent} the user ${auto ? "pinned" : "checked to send"} follow with their originals, each marked "[Image IMG-xxx included…]": they are in front of you now; when asked about one, look at it and answer from it, and do not say you cannot see it.` : null,
      count > resent ? `${resent ? "The other" : "These"} ${count - resent} are not included as originals this time (${auto ? "automatic image selection is on, so images from earlier turns are left out by default" : "the user unchecked them"}, to save context): they are in the list below, one line each, with the id, name, and the features and ratings you noted.` : null,
      "These images really existed in the turn where they appeared, and you looked at them then; what you said about them, and the judgments you based on it, were made looking at the original images and remain valid; do not take them back or call them guesses or made up. Do not add details you did not mention before about images you cannot see now.",
      count > resent
        ? auto
          ? "When an answer needs an image from the list and what you said about it before is not enough, call the cam_view_image tool with its id (several ids at once if you need several); the original comes back in that tool result. Do not ask the user to upload images again, and do not read the files of the listed images with other tools. Images the user newly asks you to look at are not affected: look at them as usual."
          : "When a question can only be answered by looking at an image from the list, write a line \"need IMG-xxx\" in your reply (with its number; list each one needed): once the user checks it again, the original comes back here. Do not ask the user to upload it again."
        : null,
    ].filter((line) => line !== null).join("\n"),
    fetch: {
      title: "View omitted images",
      description: "View the originals of one or more omitted images in this task. Omitted images appear in the conversation as \"[Image IMG-xxx omitted…]\". Call it only when an answer needs to look at an image and what you said about it before is not enough; the originals are included only in this turn.",
      ids: "Ids of the images to view, e.g. [\"IMG-004\"]; pass several at once if you need several.",
      missing: (id) => `This task has no ${id}.`,
      unavailable: (id) => `The original of ${id} could not be read.`,
      off: "Automatic image selection is off in this task: omitted images come back only when the user checks them. If you need one, write \"need IMG-xxx\" in your reply.",
    },
    featureNote: [
      "Feature line note (from the context asset manager the user installed): every image in this task has an ID, written in the \"[Image IMG-xxx …]\" line before it. The user installed this tool so that you can still tell the images apart later, also after the conversation is compacted, and remember what the user said about each. So begin the last reply of every turn (not what you say between tool calls) with one feature line for each image that is new in this turn, then a blank line, then your reply, in this form:",
      "[//]: # (cam IMG-015 place | visible features)",
      "- First the place, then what can be seen (shot size, subject, angle, light, colors, composition), about 15 words at most, for example \"[//]: # (cam IMG-015 street | close-up, facing the camera, rainy night, neon reflections)\".",
      "- The place is where the picture is set, specific enough to tell it apart, such as \"study\", \"outside the café\" or \"subway platform\"; for a close-up that doesn't show it, write what you know. No scene numbers, versions or what the image is for (first frame, sketch, check); time of day and weather go in the features.",
      "- An image of several places (a storyboard, a contact sheet) gets \"several places\"; one set nowhere gets what it is: character, object, document, web page.",
      "- For a place you named before, reuse that name.",
      "- Only what can be seen; no judgments such as \"beautiful\" or \"looks like someone\". One line per image, written once and never changed. Write one for the images the user uploaded, the ones you generated or viewed, and those in tool results; not for images you fetched with cam_view_image or images without an ID.",
      "- An image marked \"[Image IMG-xxx included, no feature line yet…]\" is from an earlier turn that was interrupted before you wrote its line; it is included once more in this turn: write its line too.",
      "- If a feature line you wrote turns out wrong (for example, the user points it out), write the whole line again in the same form, starting with \"corrected:\", for example \"[//]: # (cam IMG-005 corrected: character | front close-up, scar on the left eyebrow)\"; it replaces the old one.",
      "- When the user rates an image, even turns later, first make sure which one it is, then note the user's own words in a line of about 8 words at most, for example \"[//]: # (cam IMG-003 rated: too dark)\". The rating is the user's own view: note it even if you see it differently. If you are not sure which image it is, do not note it; you may ask the user which one they mean, without mentioning the noting. When the user only rates images and asks for nothing, a short reply to what they said is enough; do not explain what you noted or which image you matched it to.",
      "- Put these lines before your reply with a blank line after them, one image per line, and no parentheses inside them. In a turn with no new image and no rating, write none of these lines. These lines are for this tool only; the user does not see them on screen. Answer as usual and do not mention these lines; when the user rates an image, do not acknowledge the noting either, such as \"noted\", \"I'll keep that in mind\" or \"I'll refer to this later\".",
      "- Images left out later carry your feature line and the ratings you noted in their placeholders, also after a compaction. Check them when you pick an image; when unsure, get the original back first (the \"Context management note\" says how) or ask the user which one.",
    ].join("\n"),
    notes: (line, ratings) => [
      line ? `Features: ${line}` : null,
      ratings.length ? `rated: ${ratings.map((rating) => `"${rating.text}"${rating.turn !== null ? ` (turn ${rating.turn})` : ""}`).join(", ")}` : null,
    ].filter((part) => part !== null).join("; "),
  },
};

// The Chinese note, tested on 2026-09-25; v0.1-24 (2026-09-28) spells out how to ask for an image back ("需要 IMG-xxx",
// several at once, no re-uploading), after GPT-6 Luna asked the user to "reattach" images instead; v0.1-25 says where a
// checked image comes back (its old place, marked "已提供"), after Luna looked for it in the newest message instead.
export const OMISSION_NOTE = WORDS.zh.note;
export const omissionNote = (lang: Lang) => WORDS[lang].note;

function heading(words: Words, image: Described, state: string): string {
  const fields = [image.name ?? words.unnamed, words.kind[image.kind]];
  if (image.turn !== null) fields.push(words.turn(image.turn));
  if (image.width && image.height) fields.push(`${image.width}×${image.height}`);
  return words.heading(image.id, image.label, state, fields);
}

// v0.8: a feature line or rating longer than the note allows is cut after the last punctuation mark (or space) that
// still fits, with "…"; the model is asked to keep them short, and the panel searches the full text. v0.10: the caps
// count width, whatever the language setting: a CJK character 10, any other 3, so a cap of 30 fits 30 Chinese
// characters or 100 Latin ones (an English feature line in a Chinese task was cut to its place before, and lines that
// differed only after it read the same).
const CLIP_AT = /[，。；、！？,.;!?｜|：:\s]/u;
const WIDE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}　-〿＀-￯]/u;
// A rating keeps as much as a feature line: they are the user's own words, and only a few per session (a long replay
// lost half of one at 15, 2026-10-31).
const CAPS = { line: 30, rating: 30 };
export function clip(text: string, max: number): string {
  const chars = [...text.trim()];
  let width = 0;
  const end = chars.findIndex((char) => (width += WIDE.test(char) ? 10 : 3) > max * 10);
  if (end < 0) return chars.join("");
  let cut = end;
  for (let i = end - 1; i > 0; i--) if (CLIP_AT.test(chars[i])) { cut = i; break; }
  return `${chars.slice(0, cut).join("").trimEnd()}…`;
}

// v0.8: the line under a placeholder's heading: the model's feature line and the latest three ratings it noted, with
// their turns; null when it noted nothing (e.g. an image from before v0.8).
function notesLine(words: Words, image: Described): string | null {
  const { line = null, ratings = [] } = image.notes ?? {};
  if (!line && !ratings.length) return null;
  return words.notes(line ? clip(line, CAPS.line) : null, ratings.slice(-3).map((rating) => ({ ...rating, text: clip(rating.text, CAPS.rating) })));
}

export function plainPlaceholder(image: Described, lang: Lang = "zh"): string {
  const words = WORDS[lang];
  return [heading(words, image, words.omitted), notesLine(words, image), words.plain(image.id)].filter((line) => line !== null).join("\n");
}

export function duplicatePlaceholder(image: Described, same: Described, lang: Lang = "zh"): string {
  const words = WORDS[lang];
  const where = [same.name, same.turn !== null ? words.turn(same.turn) : words.thisTurn].filter(Boolean).join(words.separator);
  return `${heading(words, image, words.notRepeated)}\n${words.duplicate(same.id, where)}`;
}

// Put right before an image that is still sent, so the model can tell which id it is: Codex's own labels ("[Image #2]")
// start again in every message.
export function includedLabel(image: Described, lang: Lang = "zh"): string {
  return heading(WORDS[lang], image, image.awaiting ? WORDS[lang].includedAwaiting : WORDS[lang].included);
}

// v0.3: automatic selection.
export const autoNote = (lang: Lang) => WORDS[lang].autoNote;
export const fetchWords = (lang: Lang): FetchWords => WORDS[lang].fetch;
// v0.4: the same words for a Claude Code request (anthropic-messages/rewrite.ts).
export const copyNote = (id: string, lang: Lang) => WORDS[lang].copy(id);
export const newImageWord = (lang: Lang) => WORDS[lang].newImage;

// v0.4, Claude Code only: the note also speaks of tool results, and a short note follows each message holding omitted
// images, naming them. Codex's words stay as they are.
export const claudeNote = (lang: Lang, auto = false) => `${auto ? WORDS[lang].autoNote : WORDS[lang].note}\n${WORDS[lang].toolNote}`;
export function hereNote(images: Described[], lang: Lang = "zh", auto = false): string {
  const words = WORDS[lang];
  const list = images.map((image) => words.listItem(image.id, image.name, words.kind[image.kind])).join(words.separator);
  return auto ? words.hereAuto(list) : words.here(list);
}

// v0.5, Claude Code only: the note after the message holding a compaction summary, listing the images from before it
// and naming the ones not sent this time. Their placeholders are the first in the request, so the full note comes
// first, as it does after the first message holding placeholders (anthropic-messages/rewrite.ts).
// v0.10: the images are no longer listed in the note, only counted with their ids (the ones before the latest
// compaction are the first ids); those not sent are in the list after the summary (compactList).
export function compactedNote(images: Described[], sent: Set<string>, lang: Lang = "zh", auto = false): string {
  const words = WORDS[lang];
  const missing = images.filter((image) => !sent.has(image.id)).length;
  const range = images.length > 1 ? `${images[0].id}${lang === "zh" ? " 到 " : " to "}${images[images.length - 1].id}` : images[0]?.id ?? "";
  const own = words.compacted(images.length, range, missing, auto);
  return missing ? `${claudeNote(lang, auto)}\n${own}` : own;
}

// v0.10: an image put back after a compaction without its original, in one line: id, name, source, turn, and what
// the model noted (as in a placeholder). A placeholder apiece repeated the same words for every image; a session with
// 127 images before its compaction took about 1.7–2.0萬 tokens per request that way, about 0.7–0.9萬 as lines
// (docs/v0.10/plan.md). `same`: the id of an earlier line with the same picture (sent again), named instead of its
// features.
export function compactLine(image: Described, lang: Lang = "zh", same: string | null = null): string {
  const words = WORDS[lang];
  const fields = [image.id, image.name ?? "-", words.kindShort[image.kind], image.turn !== null ? words.turn(image.turn) : "-"];
  const { line = null, ratings = [] } = image.notes ?? {};
  if (same) fields.push(words.sameShort(same));
  else if (line) fields.push(clip(line, CAPS.line));
  if (ratings.length) fields.push(words.notes(null, ratings.slice(-3).map((rating) => ({ ...rating, text: clip(rating.text, CAPS.rating) }))));
  return fields.join(lang === "zh" ? "｜" : " | ");
}

// The images carry what the indexes know of their content (thread-index.ts, IndexedImage): the same digest or pixels
// is the same picture.
type Listed = Described & { contentId?: string; pixelSha256?: string | null };
export function compactList(images: Listed[], lang: Lang = "zh"): string {
  const sameAs = (image: Listed, at: number) => images.slice(0, at).find((other) => (image.contentId !== undefined && other.contentId === image.contentId) || (image.pixelSha256 && other.pixelSha256 === image.pixelSha256))?.id ?? null;
  return [WORDS[lang].compactHeader(images.length), ...images.map((image, at) => compactLine(image, lang, sameAs(image, at)))].join("\n");
}

// v0.10, Codex: the note before the images its compaction did not keep (addCodexCompacted).
export const codexCompactedNote = (count: number, resent: number, auto: boolean, lang: Lang) => WORDS[lang].codexCompacted(count, resent, auto);

export function autoPlaceholder(image: Described, lang: Lang = "zh"): string {
  const words = WORDS[lang];
  return [heading(words, image, words.omitted), notesLine(words, image), words.autoPlain(image.id)].filter((line) => line !== null).join("\n");
}

// v0.8: the feature line note, for a task's own requests (not a side chat's or a subagent's).
export const featureNote = (lang: Lang) => WORDS[lang].featureNote;

// The line cam_view_image puts before each image it returns. Without Codex's own label ("[Image #3]"), which numbers
// images within their message and means nothing here: GPT-6 Luna once read it as the digit asked about.
export function fetchedLabel(image: Described, lang: Lang = "zh"): string {
  return heading(WORDS[lang], { ...image, label: null }, FETCHED_STATE[lang]);
}
