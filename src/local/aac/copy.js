const strings = {
  brand: ['粵語說話', 'Open AAC', '轻松表达'],
  tagline: [
    '每一個聲音，都值得被聽見',
    'A little space for every thought',
    '每一个声音，都值得被听见'
  ],
  board: ['字詞板', 'Word board', '词语板'],
  quick: ['常用句子', 'Quick phrases', '常用句子'],
  typing: ['打字講嘢', 'Type to speak', '打字说话'],
  routine: ['今日流程', 'Daily routine', '今日安排'],
  greet: [
    '你好，慢慢講，唔使急。',
    'Hello. Take your time.',
    '你好，慢慢说，不用急。'
  ],
  title: ['今日想講啲乜？', 'What would you like to say?', '今天想说些什么？'],
  subtitle: [
    '揀圖卡，組句子，表達你嘅心聲。',
    'Choose pictures. Build a message. Be heard.',
    '选图卡，组句子，表达你的心声。'
  ],
  message: ['我想講⋯⋯', 'I want to say…', '我想说……'],
  speak: ['講出嚟', 'Speak', '说出来'],
  stop: ['停止朗讀', 'Stop speaking', '停止朗读'],
  clear: ['清除', 'Clear', '清除'],
  undo: ['復原', 'Undo', '撤销'],
  backShort: ['刪一字', 'Back', '删一字'],
  backspace: ['刪除上一個字', 'Remove last word', '删除上一个词'],
  search: [
    '搵字詞，例如：水、開心⋯⋯',
    'Find a word, e.g. water, happy…',
    '找词语，例如：水、开心……'
  ],
  searchLabel: ['搜尋字詞', 'Find vocabulary', '搜索词语'],
  allResults: ['搜尋結果', 'Search results', '搜索结果'],
  noResults: [
    '搵唔到。試吓另一個字，或者用打字功能。',
    'No words found. Try another word or type your message.',
    '没有找到。试试其他词语，或使用打字功能。'
  ],
  tapHint: [
    '輕觸圖卡，加入句子',
    'Tap a picture to add a word',
    '轻触图卡，加入句子'
  ],
  stable: [
    '常用字詞嘅位置固定，慢慢熟習就得。',
    'Core words stay in the same places, so you can learn where they are.',
    '常用词语位置固定，慢慢熟悉就好。'
  ],
  favourite: ['收藏', 'Favourites', '收藏'],
  allPhrases: ['所有句子', 'All phrases', '所有句子'],
  saved: ['我嘅句子', 'My phrases', '我的句子'],
  quickHint: [
    '輕觸一句，即刻講出嚟。',
    'One tap to say a whole thought.',
    '轻触一句，立即说出来。'
  ],
  emptySaved: [
    '喺打字功能儲存你常用嘅句子。',
    'Save your own phrases in Type to speak.',
    '在打字功能保存你常用的句子。'
  ],
  pin: ['收藏句子', 'Favourite phrase', '收藏句子'],
  unpin: ['取消收藏', 'Remove favourite', '取消收藏'],
  typeHint: [
    '用你習慣嘅方式表達。',
    'Your words, just the way you want them.',
    '用你习惯的方式表达。'
  ],
  typePlaceholder: [
    '喺呢度輸入你想講嘅說話⋯⋯',
    'Type what you want to say…',
    '在这里输入你想说的话……'
  ],
  savePhrase: ['儲存句子', 'Save phrase', '保存句子'],
  phraseSaved: [
    '已儲存喺「我嘅句子」。',
    'Saved to My phrases.',
    '已保存到“我的句子”。'
  ],
  suggestions: ['你可能想講', 'You might want to say', '你可能想说'],
  delete: ['刪除', 'Delete', '删除'],
  partner: ['俾對方睇', 'Show my message', '给对方看'],
  partnerTitle: ['我想同你講', 'A message for you', '我想对你说'],
  partnerHint: [
    '請俾我少少時間表達。',
    'Please give me time to communicate.',
    '请给我一点时间表达。'
  ],
  rotate: ['轉向對方', 'Rotate for partner', '转向对方'],
  close: ['關閉', 'Close', '关闭'],
  settings: ['偏好設定', 'Preferences', '偏好设置'],
  voice: ['語音', 'Voice', '语音'],
  language: ['說話語言', 'Speaking language', '说话语言'],
  deviceVoice: ['裝置語音', 'Device voice', '设备语音'],
  autoVoice: [
    '自動揀選合適語音',
    'Choose a matching voice automatically',
    '自动选择匹配的语音'
  ],
  bundled: [
    '內置字詞及句子錄音',
    'Included word & phrase audio',
    '内置词语及句子语音'
  ],
  voiceReady: ['廣東話，隨時可以講', 'Ready when you are', '随时可以说'],
  deviceReady: [
    '使用合適嘅裝置語音',
    'Using a matching device voice',
    '使用匹配的设备语音'
  ],
  testVoice: ['試聽語音', 'Try the voice', '试听语音'],
  listen: ['試聽', 'Listen', '试听'],
  checkVoice: ['試吓聲音', 'Check voice', '检查语音'],
  voiceCheckIntro: [
    '輕觸下面嘅按鈕，聽吓係咪你想用嘅語言同聲音。',
    'Tap below to check that you hear the language and voice you want.',
    '点击下方按钮，确认听到的是你想用的语言和声音。'
  ],
  voicePlaying: ['朗讀中⋯⋯', 'Playing…', '正在朗读……'],
  voiceCheckQuestion: [
    '聽到呢句說話，而且語言正確嗎？',
    'Did you hear the phrase in the right language?',
    '听到这句话，而且语言正确吗？'
  ],
  voiceCheckHint: [
    '確認後會記住你嘅選擇。隨時可以再試聽。',
    'Your confirmation is remembered. You can test again anytime.',
    '确认后会记住你的选择。随时可以再次试听。'
  ],
  voiceHeard: ['聽到，語言正確', 'Yes, that sounds right', '听到了，语言正确'],
  voiceNotHeard: [
    '聽唔到／語言唔啱',
    'No sound / wrong language',
    '没声音／语言不对'
  ],
  voiceLater: [
    '遲啲再試，繼續用',
    'Try later, keep communicating',
    '稍后再试，继续使用'
  ],
  volumeHelp: [
    '先調高媒體音量，檢查藍牙耳機或喇叭。亦可以喺偏好設定揀另一把合適語音；自訂圖卡可以用自己嘅錄音。',
    'Turn up media volume and check Bluetooth headphones or speakers. In Preferences, try another matching voice; custom words can use your own recordings.',
    '请调高媒体音量，检查蓝牙耳机或音箱。也可以在偏好设置选择其他匹配语音；自定义图卡可使用自己的录音。'
  ],
  noVoice: [
    '未搵到呢種語言嘅裝置語音。內置圖卡及句子仍然可以發聲；自訂文字需要先安裝合適語音，或錄低你嘅聲音。',
    'No matching device voice. Included words and phrases still speak. For custom text, install the matching voice or record your own.',
    '未找到这种语言的设备语音。内置图卡及句子仍可发声；自定义文字需要先安装匹配的语音，或录制你的声音。'
  ],
  voiceHelp: [
    'iPhone / iPad：喺「設定 → 輔助使用」嘅朗讀／語音選項下載「中文（香港）」語音。Android：喺文字轉語音設定安裝廣東話語音，再重新開啟此頁。',
    'iPhone / iPad: in Settings → Accessibility, find Read & Speak / Spoken Content and download a voice for the selected language (Cantonese: Chinese, Hong Kong). Android: install matching voice data in text-to-speech settings, then reopen this page.',
    'iPhone / iPad：在“设置 → 辅助功能”的朗读／语音选项下载对应中文语音。Android：在文字转语音设置安装对应语音后，重新打开此页。'
  ],
  speechError: [
    '暫時未能朗讀。請檢查裝置音量，或試用內置句子／個人錄音。',
    'Speech could not play. Check device volume, or try an included phrase or recording.',
    '暂时无法朗读。请检查设备音量，或试用内置句子／个人录音。'
  ],
  appearance: ['畫面同操作', 'Display & access', '显示与操作'],
  density: ['圖卡大小', 'Picture size', '图卡大小'],
  comfortable: ['舒適', 'Comfortable', '舒适'],
  large: ['大圖卡', 'Large pictures', '大图卡'],
  compact: ['更多圖卡', 'More pictures', '更多图卡'],
  contrast: ['高對比', 'High contrast', '高对比'],
  largeText: ['大字體', 'Larger text', '大字体'],
  speakOnTap: ['輕觸圖卡時朗讀', 'Speak words on tap', '轻触图卡时朗读'],
  haptics: [
    '觸覺回應（裝置支援時）',
    'Haptic feedback, where supported',
    '触觉反馈（设备支持时）'
  ],
  rate: ['語速', 'Speaking speed', '语速'],
  backup: ['備份同還原', 'Backup & restore', '备份与恢复'],
  backupHint: [
    '呢個備份包含三語圖卡修改、個人錄音、收藏句子、流程同偏好。進階溝通板請使用下方嘅另一個備份功能。',
    'This backup includes word edits, recordings, saved phrases, routines and preferences. Use the separate backup below for advanced boards.',
    '此备份包含三语图卡修改、个人录音、收藏句子、流程和偏好。高级沟通板请使用下方的独立备份功能。'
  ],
  export: ['匯出工作區備份', 'Export workspace backup', '导出工作区备份'],
  restore: ['還原工作區備份', 'Restore workspace backup', '恢复工作区备份'],
  restoreConfirm: [
    '還原會取代目前工作區。請先匯出一份備份。',
    'Restoring replaces this workspace. Export a backup first.',
    '恢复会替换当前工作区。请先导出一份备份。'
  ],
  confirmRestore: ['確認還原', 'Restore now', '确认恢复'],
  restored: ['已還原工作區。', 'Workspace restored.', '已恢复工作区。'],
  invalidBackup: [
    '未能還原。請選擇有效、32 MB 以下嘅工作區備份。',
    'Could not restore. Choose a valid workspace backup smaller than 32 MB.',
    '无法恢复。请选择有效且小于 32 MB 的工作区备份。'
  ],
  advanced: [
    '進階溝通板及編輯器',
    'Advanced boards & editor',
    '高级沟通板与编辑器'
  ],
  advancedBackup: [
    '進階溝通板備份',
    'Advanced board backups',
    '高级沟通板备份'
  ],
  about: ['關於及授權', 'About & licenses', '关于与许可'],
  offline: ['離線準備完成', 'Ready to reopen offline', '离线准备完成'],
  offline_ready: ['可離線使用', 'Offline ready', '可离线使用'],
  offline_preparing: ['下載中⋯⋯', 'Downloading…', '下载中……'],
  offline_paused: ['連線後再下載', 'Connect to finish', '联网后继续下载'],
  offline_unavailable: ['離線未準備好', 'Offline not ready', '离线尚未就绪'],
  offlineDetails: ['離線使用', 'Offline use', '离线使用'],
  offlineReadyHelp: [
    '圖卡同內置錄音已下載完成，可以離線重新開啟。',
    'Pictures and included audio are downloaded, so you can reopen the app offline.',
    '图卡和内置录音已下载完成，可以离线重新打开。'
  ],
  offlineDownloadHelp: [
    '首次下載約 85 MB。請保持連線同開住此頁，完成後會顯示「可離線使用」。如果未能完成，可以重新檢查。',
    'The first download is about 85 MB. Keep this page open and connected until it says “Offline ready”. If it cannot finish, try checking again.',
    '首次下载约 85 MB。请保持联网并打开此页，完成后会显示“可离线使用”。如果无法完成，可以重新检查。'
  ],
  offlineVoiceHelp: [
    '內置圖卡錄音可以離線播。自訂文字用嘅裝置語音可能需要網絡；出門前可以開飛行模式試吓。',
    'Included recordings work offline. Device voices for custom text may need a connection; try airplane mode before relying on them.',
    '内置图卡录音可离线播放。自定义文字使用的设备语音可能需要网络；出门前可用飞行模式测试。'
  ],
  retryOffline: ['重新檢查', 'Check again', '重新检查'],
  downloading: [
    '首次下載緊，完成後可離線開啟',
    'Preparing offline files…',
    '正在准备离线文件……'
  ],
  local: ['儲存喺呢部裝置', 'Saved on this device', '保存在此设备'],
  online: ['下載準備中', 'Preparing downloads', '正在准备下载'],
  edit: ['修改圖卡', 'Personalize words', '修改图卡'],
  done: ['完成', 'Done', '完成'],
  save: ['儲存', 'Save changes', '保存'],
  cancel: ['取消', 'Cancel', '取消'],
  resetWord: ['還原原本圖卡', 'Reset this word', '恢复原图卡'],
  photo: [
    '揀選相片（2 MB 以下）',
    'Choose a photo (under 2 MB)',
    '选择照片（小于 2 MB）'
  ],
  record: ['錄低自己嘅聲音', 'Record your voice', '录制自己的声音'],
  stopRecord: ['停止錄音', 'Stop recording', '停止录音'],
  recording: [
    '錄音中，最多 15 秒⋯⋯',
    'Recording, up to 15 seconds…',
    '录音中，最多 15 秒……'
  ],
  recordingReady: [
    '已加入呢種語言嘅個人錄音。',
    'Your recording is ready for this language.',
    '已添加这种语言的个人录音。'
  ],
  removeRecording: ['移除錄音', 'Remove recording', '移除录音'],
  mediaError: [
    '未能加入媒體。請檢查檔案大小或咪高峰權限。',
    'Could not add media. Check file size or microphone permission.',
    '无法添加媒体。请检查文件大小或麦克风权限。'
  ],
  scan: ['開啟圖卡掃描', 'Start picture scanning', '开启图卡扫描'],
  stopScan: ['停止掃描', 'Stop scanning', '停止扫描'],
  scanHint: [
    '空白鍵／Enter 選取圖卡，Esc 停止。',
    'Space / Enter selects the highlighted picture. Esc stops.',
    '空格键／Enter 选择高亮图卡，Esc 停止。'
  ],
  scanDelay: [
    '掃描間距（秒）',
    'Scanning interval (seconds)',
    '扫描间隔（秒）'
  ],
  routineHint: [
    '一步一步，跟住自己嘅步伐。',
    'One step at a time, at your own pace.',
    '一步一步，跟随自己的节奏。'
  ],
  now: ['而家', 'Now', '现在'],
  next: ['跟住', 'Next', '接下来'],
  later: ['之後', 'Later', '之后'],
  completeStep: ['做完呢一步', 'Mark step done', '完成这一步'],
  allDone: ['全部做完，好叻！', 'All done. Well done!', '全部完成，真棒！'],
  resetRoutine: ['重新開始流程', 'Restart routine', '重新开始安排'],
  editRoutine: ['修改流程', 'Edit routine', '修改安排'],
  routinePick: [
    '選擇最多八項，按選擇次序排列。',
    'Choose up to eight steps, in the order you want.',
    '选择最多八项，按选择顺序排列。'
  ],
  timer: ['休息計時', 'Break timer', '休息计时'],
  minutes: ['分鐘', 'min', '分钟'],
  pause: ['暫停', 'Pause', '暂停'],
  resume: ['繼續', 'Resume', '继续'],
  resetTimer: ['重設計時', 'Reset timer', '重设计时'],
  timerDone: [
    '時間到。準備好先繼續，唔使急。',
    'Time is up. Carry on when you are ready.',
    '时间到。准备好再继续，不用急。'
  ],
  welcomeTitle: [
    '你嘅說話，\n你嘅聲音。',
    'Your words.\nYour voice.',
    '你的话语，\n你的声音。'
  ],
  welcomeIntro: [
    '一個以廣東話為先嘅免費溝通空間。用圖卡、句子同自己嘅聲音，講出心裏面嘅說話。',
    'A free communication space, with Cantonese at its heart. Speak with pictures, phrases and your own voice.',
    '一个以粤语为先的免费沟通空间。用图卡、句子和自己的声音，表达心中所想。'
  ],
  start: ['開啟我嘅溝通板', 'Open my communication board', '打开我的沟通板'],
  noAccount: [
    '唔使註冊，冇訂閱費。',
    'No account or subscription needed.',
    '无需注册，没有订阅费。'
  ]
};
export function copy(language) {
  const index = language === 'en' ? 1 : language === 'cmn' ? 2 : 0;
  return Object.fromEntries(
    Object.entries(strings).map(([key, translations]) => [
      key,
      translations[index]
    ])
  );
}
