/* G7 Kanban Board (index.html): interface text in Simplified Chinese. 繁體 is made from this by kog-shell.js.
   Draft wording for David's review. Card titles, owners and notes are never translated.
   Team and KOGCycle stage names follow kog-glossary.json and the Term Diary. */
(function () {
  var TEAM = { Go: "差派", Glorify: "荣耀", Grow: "成长", Giftedness: "恩赐", Governance: "治理", Glue: "后勤", Gregarious: "关怀" };
  var STAGE = { "First Contact": "初次接触", "Face to Face": "面对面", "Follow Up": "跟进", "Meet the Minister": "认识牧师",
    "Conversion/Baptism": "归主与洗礼", "Conversion / Baptism": "归主与洗礼", "Conversion": "归主", "Integration": "融入",
    "Church Life": "教会生活", "Grow & Serve": "成长与服事", "Send": "差派" };
  var zh = {
    "G7 — Kanban Board — St Paul's Kogarah": "G7 看板 — 高嘉华圣保罗堂",
    "G7 — Kanban Board": "G7 看板",
    "St Paul's Anglican Church Kogarah": "高嘉华圣保罗堂",
    "Leadership team access": "领袖团队专用",
    "Supabase project URL": "Supabase 项目网址",
    "Supabase anon key": "Supabase 匿名密钥",
    "Passcode": "通行码",
    "Remember me on this device": "在此设备上记住我",
    "Remember me": "记住我",
    "Open the board": "打开看板",
    "Your board syncs across every device you open it on.": "您在任何设备上打开看板，内容都会同步。",
    "Enter the passcode.": "请输入通行码。",
    "Incorrect passcode — please try again.": "通行码不正确，请再试一次。",
    "Could not reach the board — check the connection.": "无法连接看板，请检查网络。",
    "Enter both the project URL and the anon key.": "请同时输入项目网址和匿名密钥。",
    "The API key was rejected. Check the publishable key.": "API 密钥被拒绝，请检查公开密钥。",
    "First run on this device: paste your Supabase project URL and anon key. They are remembered here afterwards.": "首次在此设备上使用：请粘贴 Supabase 项目网址和匿名密钥，之后会记在此设备上。",
    "St Paul's Anglican Church Kogarah | G7 Ministry Teams": "高嘉华圣保罗堂 | G7 事工团队",
    "\"We gather to build and to nurture a nation which lives and breathes the Gospel of Jesus Christ\"": "“我们聚集，为要建立并培育一群活出耶稣基督福音的子民”",
    "Updated:": "更新于：",
    "Next Review:": "下次检讨：",
    "Set automatically each time the board saves": "每次看板保存时自动设定",
    "One week after the board was last updated": "看板最后更新后的一周",
    "✓ Saved": "✓ 已保存",
    "connecting…": "正在连接…",
    "offline — saved here": "离线 · 已存在此设备",
    "◎ KOGCycle": "◎ KOG 循环",
    "📅 Term Diary": "📅 学期日程",
    "🗓️ Year Planner": "🗓️ 年度计划表",
    "See these projects along the KOGCycle": "在 KOG 循环上查看这些项目",
    "Open the Term Diary": "打开学期日程",
    "Open the Year Planner": "打开年度计划表",
    "🔒 Lock": "🔒 锁定",
    "Lock the board and forget the passcode on this device": "锁定看板，并在此设备上忘记通行码",
    "💾 Save": "💾 保存",
    "PDF columns:": "PDF 栏目：",
    "🙏 Prayer": "🙏 代祷",
    "📋 Backlog": "📋 待办",
    "⏳ Waiting": "⏳ 等候中",
    "⚡ In Progress": "⚡ 进行中",
    "✅ Completed": "✅ 已完成",
    "🙏 Prayer Items": "🙏 代祷事项",
    "📦 Archive": "📦 存档",
    "📄 View PDF": "📄 查看 PDF",
    "of goal": "目标",
    "🏠 Household Goal": "🏠 家庭目标",
    "families": "个家庭",
    "households": "个家庭",
    "Reaching every household with the Gospel of Jesus Christ in our parish": "把耶稣基督的福音带到本堂区的每一个家庭",
    "Team:": "团队：",
    "All": "全部",
    "KOG Stage:": "KOG 阶段：",
    "⏰ Follow-ups": "⏰ 跟进",
    "Show only the tasks flagged for follow-up": "只显示标记为需要跟进的事项",
    "✉️ Send reminders": "✉️ 发送提醒",
    "Write a reminder to each person who owns a flagged task": "给每位负责已标记事项的同工写提醒",
    "+ Add Task": "+ 添加事项",
    "+ Add": "+ 添加",
    "Dismiss for today": "今天不再显示",
    "Monday follow-ups": "周一跟进",
    "KOG Cycle:": "KOG 循环：",
    "St Paul's Anglican Church Kogarah · www.kogarah.church · G7 Kanban Board — See the Gospel · Hear the Gospel · Believe the Gospel · Tell the Gospel": "高嘉华圣保罗堂 · www.kogarah.church · G7 看板 — 看见福音 · 听见福音 · 相信福音 · 传扬福音",
    "Close": "关闭",
    "Add New Task": "添加新事项",
    "Edit Task": "编辑事项",
    "Task Title *": "事项标题 *",
    "e.g. Prepare SRE Sunday materials": "例如：预备 SRE 主日材料",
    "Team *": "团队 *",
    "KOG Cycle Stage": "KOG 循环阶段",
    "— Not mapped to KOG stage —": "— 未对应 KOG 阶段 —",
    "Column": "栏目",
    "Owner / Responsible": "负责人",
    "Name(s)": "姓名",
    "Due date": "截止日期",
    "Notes": "备注",
    "Context, or the action required...": "背景，或需要采取的行动…",
    "Cancel": "取消",
    "Add Task": "添加事项",
    "Save Changes": "保存修改",
    "Move to Archive": "移至存档",
    "Move left": "左移",
    "Move right": "右移",
    "Restore to Completed": "恢复到已完成",
    "Clear the follow-up flag": "取消跟进标记",
    "Flag this for Monday follow-up": "标记为周一跟进",
    "Edit": "编辑",
    "Delete": "删除",
    "People to remind": "需要提醒的人",
    "Contacts": "联络人",
    "Save contact": "保存联络人",
    "+ Add to Contacts": "+ 加入联络人",
    "Name": "姓名",
    "Email": "电邮",
    "Language": "语言",
    "Prefers": "偏好",
    "Mobile (WhatsApp / SMS)": "手机（WhatsApp / 短信）",
    "WeChat ID": "微信号",
    "Other names used on the board (comma separated)": "看板上使用的其他名字（以逗号分隔）",
    "G7 leader": "G7 领袖",
    "All leaders": "全体领袖",
    "All teams": "所有团队",
    "Edit leaders": "编辑领袖名单",
    "Goes to all": "发给全体",
    "every G7 leader": "每位 G7 领袖",
    "no details yet": "尚无联络资料",
    "or send by": "或通过以下方式发送",
    "me": "我",
    "Please enter a name.": "请输入姓名。",
    "No leaders in Contacts yet. Add them in the Contacts tab.": "联络人中还没有领袖。请在“联络人”页添加。",
    "Owners on the board with no contact yet. Tap a name to add it:": "看板上尚无联络资料的负责人。点击名字即可添加：",
    "Server said:": "服务器回复：",
    "Next Review": "下次检讨"
  };
  Object.keys(TEAM).forEach(function (k) {
    var icon = { Go: "🌍", Glorify: "🎵", Grow: "🌱", Giftedness: "🎁", Governance: "⚖️", Glue: "🤝", Gregarious: "🎉" }[k];
    zh[k] = TEAM[k]; zh[icon + " " + k] = icon + " " + TEAM[k];
  });
  zh["🌍 Go (Outreach & Mission)"] = "🌍 差派（外展与宣教）";
  zh["🎵 Glorify (Worship & Service)"] = "🎵 荣耀（敬拜与服事）";
  zh["🌱 Grow (Discipleship)"] = "🌱 成长（门训）";
  zh["🎁 Giftedness (Gifts & Calling)"] = "🎁 恩赐（恩赐与呼召）";
  zh["⚖️ Governance (Leadership & Admin)"] = "⚖️ 治理（领导与行政）";
  zh["🤝 Glue (Community & Belonging)"] = "🤝 后勤（团契与归属）";
  zh["🎉 Gregarious (Hospitality & Friendship)"] = "🎉 关怀（接待与友谊）";
  var SICON = { "First Contact": "👋", "Face to Face": "😊", "Follow Up": "📞", "Meet the Minister": "🙏", "Conversion": "💧",
    "Conversion / Baptism": "💧", "Integration": "🔗", "Church Life": "📖", "Grow & Serve": "🌟", "Send": "✈️" };
  Object.keys(STAGE).forEach(function (k) {
    zh[k] = STAGE[k];
    if (SICON[k]) zh[SICON[k] + " " + k] = SICON[k] + " " + STAGE[k];
    zh["⭕ " + k] = "⭕ " + STAGE[k];
  });
  zh["💧 Conversion / Baptism / Confirmation"] = "💧 归主 / 洗礼 / 坚信礼";
  G7I18N.init({
    zh: zh,
    re: [
      [/^Monday follow-ups — (\d+) tasks? to chase up$/, "周一跟进 — 有 $1 项需要跟进"],
      [/^⭕ (\S+) (MTM|Conversion|First Contact|Face to Face|Follow Up|Integration|Church Life|Grow & Serve|Send)$/,
        function (m, icon, s) { return "⭕ " + icon + " " + (s === "MTM" ? STAGE["Meet the Minister"] : STAGE[s]); }]
    ]
  });
})();
