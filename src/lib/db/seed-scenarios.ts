import type { Scenario, ScenarioCategory } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { buildPracticeSystemPrompt } from '@/lib/prompts/practice-guide';
import { db } from './index';

const SEED_VERSION = 3;

interface SeedDef {
  id: string;
  title: string;
  description: string;
  category: ScenarioCategory;
  characterRole: string;
  scene: string;
  suggestedVocab: string[];
}

const SEEDS: SeedDef[] = [
  // ── 日常生活 ──
  {
    id: 'daily-restaurant',
    title: '餐厅点餐',
    description: '在餐厅点单、询问推荐与结账。',
    category: 'daily_life',
    characterRole: 'a friendly waiter at a casual American diner',
    scene: 'The customer is ordering lunch at a busy diner.',
    suggestedVocab: ['menu', 'order', 'bill', 'tip', 'specials'],
  },
  {
    id: 'daily-supermarket',
    title: '超市购物',
    description: '找商品、询问价格和结账。',
    category: 'daily_life',
    characterRole: 'a helpful supermarket clerk',
    scene: 'Shopping for groceries and asking about products and prices.',
    suggestedVocab: ['aisle', 'checkout', 'receipt', 'organic', 'on sale'],
  },
  {
    id: 'daily-doctor',
    title: '看医生',
    description: '描述症状、回答医生提问。',
    category: 'daily_life',
    characterRole: 'a general practitioner at a clinic',
    scene: 'A patient visit describing symptoms and medical history.',
    suggestedVocab: ['symptom', 'prescription', 'allergy', 'appointment', 'fever'],
  },
  {
    id: 'daily-directions',
    title: '问路指路',
    description: '向路人询问方向与交通方式。',
    category: 'daily_life',
    characterRole: 'a local resident on the street',
    scene: 'Asking for directions to a nearby place.',
    suggestedVocab: ['block', 'turn left', 'subway', 'straight ahead', 'landmark'],
  },
  {
    id: 'daily-bank',
    title: '银行业务',
    description: '开户、转账与咨询理财产品。',
    category: 'daily_life',
    characterRole: 'a bank customer service representative',
    scene: 'Opening an account and asking about banking services.',
    suggestedVocab: ['account', 'transfer', 'balance', 'interest rate', 'deposit'],
  },
  {
    id: 'daily-rent',
    title: '租房咨询',
    description: '看房、询问租金与租约条款。',
    category: 'daily_life',
    characterRole: 'a rental property agent',
    scene: 'Viewing an apartment and discussing lease terms.',
    suggestedVocab: ['lease', 'deposit', 'utilities', 'furnished', 'move-in'],
  },
  // ── 社交人际 ──
  {
    id: 'social-meet',
    title: '初次见面',
    description: '自我介绍、兴趣爱好与破冰聊天。',
    category: 'social',
    characterRole: 'a new acquaintance at a casual meetup',
    scene: 'Meeting someone new at a community event.',
    suggestedVocab: ['hobby', 'from', 'nice to meet you', 'work', 'weekend'],
  },
  {
    id: 'social-party',
    title: '派对闲聊',
    description: '在聚会中轻松聊天、找话题。',
    category: 'social',
    characterRole: 'a friendly guest at a house party',
    scene: 'Casual small talk at a social gathering.',
    suggestedVocab: ['host', 'mutual friend', 'catch up', 'fun', 'music'],
  },
  {
    id: 'social-apology',
    title: '道歉解释',
    description: '为迟到或失误道歉并解释原因。',
    category: 'social',
    characterRole: 'a friend who was affected by your mistake',
    scene: 'Apologizing for being late or missing an appointment.',
    suggestedVocab: ['sorry', 'my fault', 'misunderstanding', 'make it up', 'excuse'],
  },
  {
    id: 'social-invite',
    title: '邀请朋友',
    description: '邀请朋友参加活动或聚餐。',
    category: 'social',
    characterRole: 'a close friend you want to invite out',
    scene: 'Inviting a friend to dinner or an event this weekend.',
    suggestedVocab: ['join us', 'free time', 'RSVP', 'hang out', 'plan'],
  },
  {
    id: 'social-phone',
    title: '电话沟通',
    description: '打电话预约、留言与确认信息。',
    category: 'social',
    characterRole: 'a receptionist answering the phone',
    scene: 'Making a phone call to book an appointment.',
    suggestedVocab: ['hold on', 'leave a message', 'callback', 'available', 'confirm'],
  },
  {
    id: 'social-compliment',
    title: '赞美感谢',
    description: '表达感谢、赞美与回应夸奖。',
    category: 'social',
    characterRole: 'a colleague who helped you recently',
    scene: 'Thanking someone and responding to compliments gracefully.',
    suggestedVocab: ['appreciate', 'grateful', 'kind of you', 'compliment', 'means a lot'],
  },
  // ── 学术校园 ──
  {
    id: 'academic-class',
    title: '课堂提问',
    description: '举手提问、请求重复与澄清。',
    category: 'academic',
    characterRole: 'a supportive university lecturer',
    scene: 'A lecture where the student asks questions.',
    suggestedVocab: ['clarify', 'repeat', 'homework', 'chapter', 'office hours'],
  },
  {
    id: 'academic-library',
    title: '图书馆',
    description: '借书、查询资料与预约研讨室。',
    category: 'academic',
    characterRole: 'a university librarian',
    scene: 'Borrowing books and asking about library resources.',
    suggestedVocab: ['due date', 'renew', 'reference', 'database', 'study room'],
  },
  {
    id: 'academic-group',
    title: '小组讨论',
    description: '小组项目中表达观点与分工。',
    category: 'academic',
    characterRole: 'a fellow student in a group project',
    scene: 'Group project meeting discussing tasks and deadlines.',
    suggestedVocab: ['deadline', 'divide tasks', 'presentation', 'research', 'feedback'],
  },
  {
    id: 'academic-application',
    title: '申请咨询',
    description: '咨询奖学金或项目申请流程。',
    category: 'academic',
    characterRole: 'an admissions office counselor',
    scene: 'Asking about scholarship and program application requirements.',
    suggestedVocab: ['application', 'deadline', 'requirement', 'recommendation', 'essay'],
  },
  {
    id: 'academic-advisor',
    title: '导师见面',
    description: '与导师讨论研究进展与选课。',
    category: 'academic',
    characterRole: 'an academic advisor',
    scene: 'Meeting with an advisor about course selection and research progress.',
    suggestedVocab: ['thesis', 'elective', 'credit', 'proposal', 'semester'],
  },
  {
    id: 'academic-event',
    title: '校园活动',
    description: '参加社团活动、报名与社交。',
    category: 'academic',
    characterRole: 'a student club organizer',
    scene: 'Joining a campus club event and signing up.',
    suggestedVocab: ['sign up', 'membership', 'volunteer', 'event', 'club'],
  },
  // ── 旅游出行 ──
  {
    id: 'travel-checkin',
    title: '机场值机',
    description: '办理登机、选座与行李托运。',
    category: 'travel',
    characterRole: 'an airline check-in agent',
    scene: 'Checking in for an international flight at the airport.',
    suggestedVocab: ['passport', 'boarding pass', 'luggage', 'window seat', 'gate'],
  },
  {
    id: 'travel-hotel',
    title: '酒店入住',
    description: '办理入住、询问设施与服务。',
    category: 'travel',
    characterRole: 'a hotel front desk receptionist',
    scene: 'Checking into a hotel and asking about amenities.',
    suggestedVocab: ['reservation', 'checkout time', 'wifi', 'breakfast', 'room key'],
  },
  {
    id: 'travel-navigation',
    title: '问路导航',
    description: '在旅途中问路、乘坐公共交通。',
    category: 'travel',
    characterRole: 'a local tour guide',
    scene: 'Asking how to get to tourist attractions using public transport.',
    suggestedVocab: ['metro', 'ticket', 'platform', 'transfer', 'tourist spot'],
  },
  {
    id: 'travel-car',
    title: '租车服务',
    description: '租车、询问保险与还车规则。',
    category: 'travel',
    characterRole: 'a car rental agent',
    scene: 'Renting a car and discussing insurance options.',
    suggestedVocab: ['rental', 'insurance', 'mileage', 'return', 'driver license'],
  },
  {
    id: 'travel-ticket',
    title: '景点购票',
    description: '购买门票、询问开放时间与优惠。',
    category: 'travel',
    characterRole: 'a ticket booth staff member at a museum',
    scene: 'Buying tickets for a museum or attraction.',
    suggestedVocab: ['admission', 'student discount', 'audio guide', 'exhibition', 'hours'],
  },
  {
    id: 'travel-lost',
    title: '失物招领',
    description: '丢失物品、报案与寻求帮助。',
    category: 'travel',
    characterRole: 'a lost and found office staff member',
    scene: 'Reporting a lost item at the airport or hotel.',
    suggestedVocab: ['lost property', 'claim', 'describe', 'report', 'found'],
  },
  // ── 商务职场 ──
  {
    id: 'biz-interview',
    title: '工作面试',
    description: '自我介绍与常见面试问答。',
    category: 'business',
    characterRole: 'an HR recruiter conducting a job interview',
    scene: 'A job interview for a professional position.',
    suggestedVocab: ['experience', 'strength', 'teamwork', 'background', 'role'],
  },
  {
    id: 'biz-meeting',
    title: '商务会议',
    description: '参与会议、发表意见与总结。',
    category: 'business',
    characterRole: 'a team lead running a weekly meeting',
    scene: 'A team meeting discussing project updates and next steps.',
    suggestedVocab: ['agenda', 'action item', 'update', 'deadline', 'follow up'],
  },
  {
    id: 'biz-email-call',
    title: '客户沟通',
    description: '与客户电话或邮件式口语沟通。',
    category: 'business',
    characterRole: 'a client calling about a service issue',
    scene: 'Handling a client call about a product or service inquiry.',
    suggestedVocab: ['inquiry', 'resolve', 'follow up', 'timeline', 'satisfaction'],
  },
  {
    id: 'biz-presentation',
    title: '产品演示',
    description: '向客户演示产品并回答问题。',
    category: 'business',
    characterRole: 'a potential client at a product demo',
    scene: 'Presenting a product and answering client questions.',
    suggestedVocab: ['feature', 'benefit', 'demo', 'pricing', 'competitive'],
  },
  {
    id: 'biz-complaint',
    title: '投诉处理',
    description: '处理客户投诉、提出解决方案。',
    category: 'business',
    characterRole: 'an upset customer with a complaint',
    scene: 'Handling a customer complaint professionally.',
    suggestedVocab: ['apologize', 'solution', 'refund', 'escalate', 'resolve'],
  },
  {
    id: 'biz-networking',
    title: '职场社交',
    description: '行业活动中的社交与名片交换。',
    category: 'business',
    characterRole: 'a professional at a networking event',
    scene: 'Networking at an industry conference.',
    suggestedVocab: ['connect', 'industry', 'collaborate', 'LinkedIn', 'opportunity'],
  },
  // ── 自由对话 ──
  {
    id: 'free-chat',
    title: '自由对话',
    description: '无特定场景，随意用英语聊天练习。',
    category: 'free_chat',
    characterRole: 'a friendly English conversation partner',
    scene: 'An open-ended English conversation on any topic the user chooses.',
    suggestedVocab: ['opinion', 'experience', 'recommend', 'interesting', 'thoughts'],
  },
];

export async function seedScenarios(): Promise<void> {
  const count = await db.scenarios.count();
  const marker = await db.scenarios.get('free-chat');
  if (marker?.seedVersion === SEED_VERSION && count >= SEEDS.length) {
    return;
  }

  const scenarios: Scenario[] = SEEDS.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    category: s.category,
    difficulty: 'intermediate',
    characterRole: s.characterRole,
    systemPrompt: buildPracticeSystemPrompt(s.characterRole, s.scene, s.title),
    suggestedVocab: s.suggestedVocab,
    seedVersion: SEED_VERSION,
  }));

  await db.scenarios.clear();
  await db.scenarios.bulkPut(scenarios);
}

export async function ensureDefaultSettings(): Promise<void> {
  const existing = await db.userSettings.get(1);
  if (!existing) {
    await db.userSettings.put(DEFAULT_SETTINGS);
    return;
  }
  await db.userSettings.put({ ...DEFAULT_SETTINGS, ...existing, id: 1 });
}

export async function initDatabase(): Promise<void> {
  await seedScenarios();
  await ensureDefaultSettings();
}

export { SEEDS };
