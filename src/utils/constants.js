// Status constants
export const STATUSES = {
  ACTIVE: ['打招呼', '已发简历', '约面试'],
  ARCHIVED: ['沟通无回复', '简历被拒', '面试未通过', '我方放弃', '已拿Offer'],
};
export const ALL_STATUSES = [...STATUSES.ACTIVE, ...STATUSES.ARCHIVED];

export const STATUS_COLORS = {
  '打招呼': '#2563EB',
  '已发简历': '#7C3AED',
  '约面试': '#EA580C',
  '沟通无回复': '#475569',
  '简历被拒': '#DC2626',
  '面试未通过': '#E11D48',
  '我方放弃': '#64748B',
  '已拿Offer': '#059669',
};

export const STATUS_ICONS = {
  '打招呼': '👋',
  '已发简历': '📄',
  '约面试': '📅',
  '沟通无回复': '😶',
  '简历被拒': '❌',
  '面试未通过': '😞',
  '我方放弃': '🚫',
  '已拿Offer': '🎉',
};

export const CHANNELS = ['Boss', '智联', '猎聘', '拉勾', '其他'];

export const INTERVIEW_ROUNDS = ['初试', '二面', '三面', 'HR面', '笔试'];
export const INTERVIEW_FORMATS = ['线下面试', '腾讯会议', '电话', '视频面试'];

export const TEMPLATE_CATEGORIES = {
  greeting: '打招呼',
  follow_up: '跟进',
  thank_you: '感谢',
  other: '其他',
};

export const INTERACTION_TYPES = {
  note: '备注',
  hr_reply: 'HR回复',
  my_message: '我的消息',
  clipboard_import: '剪切板导入',
};
