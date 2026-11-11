/* The KOGCycle (cycle.html): interface text in Simplified Chinese. 繁體 is made from this by kog-shell.js.
   Draft wording for David's review. Project titles from the board are never translated.
   Stage names follow the Term Diary; the verse is Acts 9:15 in the Chinese Union Version (神 edition). */
(function () {
  G7I18N.init({
    zh: {
      "The KOGCycle — St Paul's Kogarah": "KOG 循环 — 高嘉华圣保罗堂",
      "The KOGCycle": "KOG 循环",
      "THE KOGCYCLE": "KOG 循环",
      "St Paul's Anglican Church Kogarah": "高嘉华圣保罗堂",
      "G7 projects along the New People Pathway": "沿着新朋友之路推进的 G7 项目",
      "Passcode": "通行码",
      "Remember me on this device": "在此设备上记住我",
      "View the cycle": "查看循环",
      "Checking…": "正在核对…",
      "Enter the passcode.": "请输入通行码。",
      "Incorrect passcode — please try again.": "通行码不正确，请再试一次。",
      "Could not reach the board.": "无法连接看板。",
      "← Kanban board": "← G7 看板",
      "📅 Term Diary": "📅 学期日程",
      "🗓️ Year Planner": "🗓️ 年度计划表",
      "🖨 Print": "🖨 打印",
      "🔒 Lock": "🔒 锁定",
      "From First Contact to Sent — G7 projects along the New People Pathway": "从初次接触到差派 — 沿着新朋友之路推进的 G7 项目",
      "loading…": "正在载入…",
      "TELL": "传扬", "SEE": "看见", "BELIEVE": "相信", "HEAR": "听见",
      "the Gospel": "福音",
      "“Go, for this man is my chosen instrument to take my name to Gentiles, kings, and Israelites.”": "“你只管去！他是我所拣选的器皿，要在外邦人和君王并以色列人面前宣扬我的名。”",
      "Acts 9:15 (CSB)": "使徒行传 9:15（和合本）",
      "God gathers us at St Paul's Kogarah to build and to cultivate his house of prayer which lives and breathes the gospel of Jesus Christ": "神召聚我们在高嘉华圣保罗堂，建造并培育祂祷告的殿，活出耶稣基督的福音",
      "First Contact": "初次接触",
      "Face to Face": "面对面",
      "Follow-up": "跟进",
      "Meet the Minister": "认识牧师",
      "Conversion, Baptism & Confirmation": "归主、洗礼与坚信礼",
      "Integration": "融入",
      "Church Life": "教会生活",
      "Grow & Serve": "成长与服事",
      "Send": "差派",
      "clear": "暂无",
      "✓ Completed": "✓ 已完成",
      "Not on the cycle": "不在循环上",
      "ACTIVE PROJECTS BY STAGE": "各阶段进行中的项目",
      "Nothing active at this stage.": "此阶段暂无进行中的项目。",
      "None yet.": "暂无。",
      "None.": "无。",
      "Prayer": "代祷", "Backlog": "待办", "Waiting": "等候中", "In Progress": "进行中", "Completed": "已完成",
      "KOG 3·2·1·0 · Pray for new people to come · Pray for new people to stay · Every stage owned, every handover named": "KOG 3·2·1·0 · 为新朋友到来祷告 · 为新朋友留下祷告 · 每个阶段都有人负责，每次交接都有人承接"
    },
    re: [
      [/^active$/, "项进行中"],
      [/^(\d+) active projects · (\d+) completed · as at (\d+) (\w+) (\d{4})$/, function (m, a, d, dd, mo, y) {
        var M = ["January","February","March","April","May","June","July","August","September","October","November","December"].indexOf(mo) + 1;
        return a + " 个进行中的项目 · " + d + " 个已完成 · 截至 " + y + "年" + M + "月" + dd + "日";
      }]
    ]
  });
})();
