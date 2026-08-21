/**
 * Generates the demo dataset.
 *
 * The dataset is SYNTHETIC. It is shaped like a large Malaysian bank so the
 * demo is legible to a local audience, but every person, position, date and
 * document reference in it was written for this project. It contains no real
 * employment records and is not affiliated with or endorsed by any bank.
 *
 * Kept as a script rather than a hand-typed blob so that every planted case —
 * each rename, split, merge and each data-quality defect — is visible as
 * intent rather than buried in 200 lines of CSV.
 *
 * Run:  npm run generate:data
 * Out:  src/data/demoDataset.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/demoDataset.ts');

const KL = 'Menara Maybank, Kuala Lumpur';
const CYB = 'Maybank Cyberjaya';
const BGS = 'Bangsar South, Kuala Lumpur';
const PNG = 'Penang';
const JHB = 'Johor Bahru';
const KK = 'Kota Kinabalu';

/* ------------------------------------------------------------------ *
 * 1. Leadership — the top of the reporting tree.
 * ------------------------------------------------------------------ */
const positions = [];
const P = (p) => { positions.push(p); return p.id; };

P({ id: 'P001', title: 'Group Chief Executive Officer', unit: 'Executive', div: 'Group Executive', level: 9, loc: KL, created: '2021-01-01' });
P({ id: 'P002', title: 'Group Chief Technology Officer', unit: 'Executive', div: 'Group Technology', level: 8, loc: KL, created: '2021-01-01', reports: 'P001' });
P({ id: 'P003', title: 'Group Chief Operating Officer', unit: 'Executive', div: 'Group Operations', level: 8, loc: KL, created: '2021-01-01', reports: 'P001' });
P({ id: 'P004', title: 'Head of Community Financial Services', unit: 'Executive', div: 'Community Financial Services', level: 8, loc: KL, created: '2021-01-01', reports: 'P001' });
P({ id: 'P005', title: 'Group Chief Risk Officer', unit: 'Executive', div: 'Group Risk & Compliance', level: 8, loc: KL, created: '2021-01-01', reports: 'P001' });
P({ id: 'P006', title: 'Group Chief Human Capital Officer', unit: 'Executive', div: 'Group Human Capital', level: 8, loc: KL, created: '2021-01-01', reports: 'P001' });
P({ id: 'P007', title: 'Head of Islamic Banking', unit: 'Executive', div: 'Islamic Banking', level: 8, loc: KL, created: '2021-01-01', reports: 'P001' });
P({ id: 'P008', title: 'Head of Global Banking', unit: 'Executive', div: 'Global Banking', level: 8, loc: KL, created: '2021-01-01', reports: 'P001' });

// Created mid-window: a genuinely new executive seat.
P({ id: 'P009', title: 'Head of Group Digital', unit: 'Executive', div: 'Group Digital', level: 8, loc: BGS, created: '2022-04-01', reports: 'P001' });

/* ------------------------------------------------------------------ *
 * 2. The planted lineage stories. These are what the demo walks through.
 * ------------------------------------------------------------------ */

// STORY A — rename, then redesignation. One person, one job, three titles.
P({ id: 'P101', title: 'Branch Operations Executive', unit: 'Branch Operations', div: 'Community Financial Services', level: 2, loc: KL, created: '2021-01-04', closed: '2022-06-30', reports: 'P004' });
P({ id: 'P102', title: 'Branch Operations Specialist', unit: 'Branch Operations', div: 'Community Financial Services', level: 2, loc: KL, created: '2022-07-01', closed: '2023-12-31', reports: 'P004', preds: ['P101'] });
P({ id: 'P103', title: 'Branch Experience Specialist', unit: 'Branch Operations', div: 'Community Financial Services', level: 3, loc: KL, created: '2024-01-01', reports: 'P004', preds: ['P102'] });

// STORY B — one manager role divides into two.
P({ id: 'P201', title: 'Digital Channels Manager', unit: 'Digital Product', div: 'Group Digital', level: 5, loc: BGS, created: '2021-01-04', closed: '2022-12-31', reports: 'P002' });
P({ id: 'P202', title: 'Mobile Banking Manager', unit: 'Mobile Banking', div: 'Group Digital', level: 5, loc: BGS, created: '2023-01-01', reports: 'P009', preds: ['P201'] });
P({ id: 'P203', title: 'Web Channels Manager', unit: 'Web Channels', div: 'Group Digital', level: 5, loc: BGS, created: '2023-01-01', reports: 'P009', preds: ['P201'] });

// STORY C — two leads consolidate into one. Headcount falls, work does not.
P({ id: 'P301', title: 'Cards Operations Lead', unit: 'Cards Operations', div: 'Group Operations', level: 5, loc: KL, created: '2021-01-04', closed: '2023-12-31', reports: 'P003' });
P({ id: 'P302', title: 'Payments Operations Lead', unit: 'Payments Operations', div: 'Group Operations', level: 5, loc: KL, created: '2021-01-04', closed: '2023-12-31', reports: 'P003' });
P({ id: 'P303', title: 'Payments & Cards Operations Lead', unit: 'Payments Operations', div: 'Group Operations', level: 5, loc: KL, created: '2024-01-01', reports: 'P003', preds: ['P301', 'P302'] });

// STORY D — a successor exists but the titles barely overlap. Needs a human.
P({ id: 'P401', title: 'Regional Sales Manager, Northern', unit: 'Retail Distribution', div: 'Community Financial Services', level: 5, loc: PNG, created: '2021-01-04', closed: '2023-06-30', reports: 'P004' });
P({ id: 'P402', title: 'Territory Growth Lead', unit: 'Retail Distribution', div: 'Community Financial Services', level: 5, loc: PNG, created: '2023-07-01', reports: 'P004', preds: ['P401'] });

// STORY E — an engineering role divides as the cloud migration lands.
P({ id: 'P501', title: 'Infrastructure Engineer', unit: 'Cloud & Infrastructure', div: 'Group Technology', level: 3, loc: CYB, created: '2021-01-04', closed: '2022-09-30', reports: 'P002' });
P({ id: 'P502', title: 'Cloud Platform Engineer', unit: 'Cloud & Infrastructure', div: 'Group Technology', level: 3, loc: CYB, created: '2022-10-01', reports: 'P002', preds: ['P501'] });
P({ id: 'P503', title: 'Network Operations Engineer', unit: 'Cloud & Infrastructure', div: 'Group Technology', level: 3, loc: CYB, created: '2022-10-01', reports: 'P002', preds: ['P501'] });

// STORY F — same work, higher grade. A redesignation, not a promotion of the seat.
P({ id: 'P601', title: 'Data Analyst', unit: 'Data & Analytics', div: 'Group Technology', level: 3, loc: CYB, created: '2021-01-04', closed: '2023-03-31', reports: 'P002' });
P({ id: 'P602', title: 'Data Scientist', unit: 'Data & Analytics', div: 'Group Technology', level: 4, loc: CYB, created: '2023-04-01', reports: 'P002', preds: ['P601'] });

// STORY G — two HR leads merge.
P({ id: 'P701', title: 'Talent Acquisition Lead', unit: 'Talent & Rewards', div: 'Group Human Capital', level: 5, loc: KL, created: '2021-01-04', closed: '2024-06-30', reports: 'P006' });
P({ id: 'P702', title: 'Learning & Development Lead', unit: 'Organisational Development', div: 'Group Human Capital', level: 5, loc: KL, created: '2021-01-04', closed: '2024-06-30', reports: 'P006' });
P({ id: 'P703', title: 'Talent & Development Lead', unit: 'Talent & Rewards', div: 'Group Human Capital', level: 5, loc: KL, created: '2024-07-01', reports: 'P006', preds: ['P701', 'P702'] });

// STORY H — genuinely new seats. Real growth, not relabelling.
P({ id: 'P801', title: 'Head of AI Enablement', unit: 'Data & Analytics', div: 'Group Technology', level: 6, loc: CYB, created: '2025-01-06', reports: 'P002' });
P({ id: 'P802', title: 'Machine Learning Engineer', unit: 'Data & Analytics', div: 'Group Technology', level: 4, loc: CYB, created: '2025-02-03', reports: 'P801' });
P({ id: 'P803', title: 'AI Governance Specialist', unit: 'Regulatory Compliance', div: 'Group Risk & Compliance', level: 4, loc: KL, created: '2025-04-01', reports: 'P005' });

/* ------------------------------------------------------------------ *
 * 3. The rest of the organisation. Ordinary seats that give the
 *    headcount chart and the snapshot table something real to show.
 * ------------------------------------------------------------------ */
const filler = [
  // Group Technology
  ['P510', 'Site Reliability Engineer', 'Cloud & Infrastructure', 'Group Technology', 3, CYB, '2021-03-01', null, 'P002'],
  ['P511', 'Core Banking Engineer', 'Core Banking Platforms', 'Group Technology', 3, CYB, '2021-01-04', null, 'P002'],
  ['P512', 'Core Banking Engineer II', 'Core Banking Platforms', 'Group Technology', 4, CYB, '2022-02-01', null, 'P002'],
  ['P513', 'Integration Engineer', 'Core Banking Platforms', 'Group Technology', 3, CYB, '2021-06-01', null, 'P002'],
  ['P514', 'Security Operations Analyst', 'Cybersecurity', 'Group Technology', 3, CYB, '2021-01-04', null, 'P002'],
  ['P515', 'Security Engineer', 'Cybersecurity', 'Group Technology', 4, CYB, '2022-05-02', null, 'P002'],
  ['P516', 'Head of Cybersecurity', 'Cybersecurity', 'Group Technology', 6, CYB, '2021-01-04', null, 'P002'],
  ['P517', 'Data Engineer', 'Data & Analytics', 'Group Technology', 3, CYB, '2021-09-01', null, 'P002'],
  ['P518', 'Analytics Translator', 'Data & Analytics', 'Group Technology', 3, CYB, '2023-08-01', null, 'P002'],
  ['P519', 'QA Automation Engineer', 'Core Banking Platforms', 'Group Technology', 3, CYB, '2021-04-01', null, 'P002'],

  // Group Digital
  ['P210', 'Product Manager, MAE', 'Mobile Banking', 'Group Digital', 4, BGS, '2021-02-01', null, 'P009'],
  ['P211', 'Product Designer', 'Digital Product', 'Group Digital', 3, BGS, '2021-05-03', null, 'P009'],
  ['P212', 'Senior Product Designer', 'Digital Product', 'Group Digital', 4, BGS, '2023-02-01', null, 'P009'],
  ['P213', 'iOS Engineer', 'Mobile Banking', 'Group Digital', 3, BGS, '2021-03-01', null, 'P202'],
  ['P214', 'Android Engineer', 'Mobile Banking', 'Group Digital', 3, BGS, '2021-03-01', null, 'P202'],
  ['P215', 'Frontend Engineer', 'Web Channels', 'Group Digital', 3, BGS, '2021-07-01', null, 'P203'],
  ['P216', 'Digital Marketing Executive', 'Digital Product', 'Group Digital', 2, BGS, '2022-01-04', null, 'P009'],
  ['P217', 'Growth Analyst', 'Digital Product', 'Group Digital', 3, BGS, '2023-03-01', null, 'P009'],

  // Community Financial Services
  ['P110', 'Branch Manager, Jalan Tuanku', 'Branch Operations', 'Community Financial Services', 4, KL, '2021-01-04', null, 'P004'],
  ['P111', 'Branch Manager, Georgetown', 'Branch Operations', 'Community Financial Services', 4, PNG, '2021-01-04', null, 'P004'],
  ['P112', 'Branch Manager, Johor Bahru City', 'Branch Operations', 'Community Financial Services', 4, JHB, '2021-01-04', null, 'P004'],
  ['P113', 'Branch Manager, Kota Kinabalu', 'Branch Operations', 'Community Financial Services', 4, KK, '2022-08-01', null, 'P004'],
  ['P114', 'Customer Service Executive', 'Branch Operations', 'Community Financial Services', 2, KL, '2021-01-04', null, 'P110'],
  ['P115', 'SME Relationship Manager', 'SME Banking', 'Community Financial Services', 4, KL, '2021-01-04', null, 'P004'],
  ['P116', 'SME Credit Analyst', 'SME Banking', 'Community Financial Services', 3, KL, '2021-02-01', null, 'P115'],
  ['P117', 'Head of SME Banking', 'SME Banking', 'Community Financial Services', 6, KL, '2021-01-04', null, 'P004'],
  ['P118', 'Retail Product Manager', 'Retail Distribution', 'Community Financial Services', 4, KL, '2022-03-01', null, 'P004'],

  // Group Operations
  ['P310', 'Payments Operations Analyst', 'Payments Operations', 'Group Operations', 2, KL, '2021-01-04', null, 'P302'],
  ['P311', 'Settlement Officer', 'Payments Operations', 'Group Operations', 2, KL, '2021-01-04', null, 'P302'],
  ['P312', 'Cards Dispute Officer', 'Cards Operations', 'Group Operations', 2, KL, '2021-01-04', null, 'P301'],
  ['P313', 'Process Improvement Lead', 'Group Operations', 'Group Operations', 5, KL, '2022-06-01', null, 'P003'],

  // Risk & Compliance
  ['P910', 'Credit Risk Analyst', 'Credit Risk', 'Group Risk & Compliance', 3, KL, '2021-01-04', null, 'P005'],
  ['P911', 'Operational Risk Manager', 'Operational Risk', 'Group Risk & Compliance', 5, KL, '2021-01-04', null, 'P005'],
  ['P912', 'Regulatory Compliance Officer', 'Regulatory Compliance', 'Group Risk & Compliance', 3, KL, '2021-01-04', null, 'P005'],
  ['P913', 'AML Analyst', 'Regulatory Compliance', 'Group Risk & Compliance', 3, KL, '2021-08-02', null, 'P005'],

  // Human Capital
  ['P710', 'HR Business Partner, Technology', 'Talent & Rewards', 'Group Human Capital', 4, KL, '2021-01-04', null, 'P006'],
  ['P711', 'HR Business Partner, Retail', 'Talent & Rewards', 'Group Human Capital', 4, KL, '2021-01-04', null, 'P006'],
  ['P712', 'Rewards Analyst', 'Talent & Rewards', 'Group Human Capital', 3, KL, '2022-01-04', null, 'P006'],
  ['P713', 'Recruiter', 'Talent & Rewards', 'Group Human Capital', 2, KL, '2021-01-04', null, 'P701'],

  // Islamic Banking
  ['P810', 'Shariah Advisory Officer', 'Shariah Advisory', 'Islamic Banking', 4, KL, '2021-01-04', null, 'P007'],
  ['P811', 'Islamic Product Manager', 'Islamic Product', 'Islamic Banking', 4, KL, '2021-01-04', null, 'P007'],
  ['P812', 'Takaful Specialist', 'Islamic Product', 'Islamic Banking', 3, KL, '2022-09-01', null, 'P007'],

  // Global Banking
  ['P820', 'Transaction Banking Manager', 'Transaction Banking', 'Global Banking', 5, KL, '2021-01-04', null, 'P008'],
  ['P821', 'Corporate Coverage Associate', 'Corporate Coverage', 'Global Banking', 3, KL, '2021-01-04', null, 'P008'],
  ['P822', 'Trade Finance Specialist', 'Transaction Banking', 'Global Banking', 3, KL, '2021-11-01', null, 'P820'],
];

for (const [id, title, unit, div, level, loc, created, closed, reports] of filler) {
  P({ id, title, unit, div, level, loc, created, closed, reports });
}

/* ------------------------------------------------------------------ *
 * 4. People. 62 of them, with assignments that produce real trajectories.
 * ------------------------------------------------------------------ */
const people = [];
const A = (personId, name, spans) => people.push({ personId, name, spans });

// -- The demo protagonist: one job, three titles, four and a half years. ----
A('E001', 'Nurul Huda binti Rashid', [
  ['P101', '2021-01-04', '2022-06-30', 'P004', 'HRIS export, row 214', 'high', 'Initial appointment'],
  ['P102', '2022-07-01', '2023-12-31', 'P004', 'Redesignation letter dated 14 Jun 2022', 'high', 'Title standardisation'],
  ['P103', '2024-01-01', null, 'P004', 'HRIS export, row 217', 'high', 'Redesignation, grade 2 to 3'],
]);

// -- The split: one manager, then one half of the role. --------------------
A('E002', 'Cheah Wan Xin', [
  ['P201', '2021-01-04', '2022-12-31', 'P002', 'HRIS export, row 088', 'high', 'Initial appointment'],
  ['P202', '2023-01-01', null, 'P009', 'Restructuring memo dated 12 Dec 2022', 'high', 'Channel split'],
]);
A('E003', 'Tan Wei Ming', [
  ['P215', '2021-07-01', '2022-12-31', 'P201', 'HRIS export, row 143', 'high', null],
  ['P203', '2023-01-01', null, 'P009', 'Restructuring memo dated 12 Dec 2022', 'high', 'Promoted into new seat'],
]);

// -- The merge: two leads, one survivor, one redeployed. -------------------
A('E004', 'Muhammad Aiman Naim bin Mohd Faizul', [
  ['P302', '2021-01-04', '2023-12-31', 'P003', 'HRIS export, row 301', 'high', null],
  ['P303', '2024-01-01', null, 'P003', 'Consolidation notice dated 20 Nov 2023', 'high', 'Merged role'],
]);
A('E005', 'Joanne Ngai Shi Ying', [
  ['P301', '2021-01-04', '2023-12-31', 'P003', 'HRIS export, row 302', 'high', null],
  ['P313', '2024-01-01', null, 'P003', 'Internal transfer letter dated 04 Dec 2023', 'high', 'Redeployed after consolidation'],
]);

// -- The successor nobody can classify confidently. ------------------------
A('E006', 'Sivakumar a/l Rajendran', [
  ['P401', '2021-01-04', '2023-06-30', 'P004', 'HRIS export, row 410', 'high', null],
  ['P402', '2023-07-01', null, 'P004', 'Org chart 2023 (PowerPoint)', 'low', 'Role redefined'],
]);

// -- The engineering split. ------------------------------------------------
A('E007', 'Lim Jia Hui', [
  ['P501', '2021-01-04', '2022-09-30', 'P002', 'HRIS export, row 501', 'high', null],
  ['P502', '2022-10-01', null, 'P002', 'Cloud migration restructure, Sep 2022', 'high', 'Specialised into cloud'],
]);
A('E008', 'Arif Danial bin Zulkarnain', [
  ['P510', '2021-03-01', '2022-09-30', 'P002', 'HRIS export, row 505', 'high', null],
  ['P503', '2022-10-01', null, 'P002', 'Cloud migration restructure, Sep 2022', 'high', 'Specialised into network'],
]);

// -- The redesignation with a grade change. --------------------------------
A('E009', 'Priya Devi a/p Manickam', [
  ['P601', '2021-01-04', '2023-03-31', 'P002', 'HRIS export, row 601', 'high', null],
  ['P602', '2023-04-01', null, 'P002', 'Redesignation letter dated 20 Mar 2023', 'high', 'Grade 3 to 4'],
]);

// -- The HR merge. ---------------------------------------------------------
A('E010', 'Farah Adlina binti Hamzah', [
  ['P701', '2021-01-04', '2024-06-30', 'P006', 'HRIS export, row 701', 'high', null],
  ['P703', '2024-07-01', null, 'P006', 'Consolidation notice dated 15 May 2024', 'high', 'Merged role'],
]);
A('E011', 'Gopal a/l Subramaniam', [
  ['P702', '2021-01-04', '2024-06-30', 'P006', 'HRIS export, row 702', 'high', null],
]);

// -- The AI hires: genuine growth. -----------------------------------------
A('E012', 'Yeoh Kai Sheng', [['P801', '2025-01-06', null, 'P002', 'HRIS export, row 801', 'high', 'External hire']]);
A('E013', 'Nur Alia binti Kamarudin', [['P802', '2025-02-03', null, 'P801', 'HRIS export, row 802', 'high', 'External hire']]);
A('E014', 'Daniel Ong Zhi Wei', [['P803', '2025-04-01', null, 'P005', 'HRIS export, row 803', 'high', 'External hire']]);

// -- Leadership. -----------------------------------------------------------
A('E015', 'Dato\u2019 Rahman bin Ibrahim', [['P001', '2021-01-04', null, null, 'HRIS export, row 001', 'high', null]]);
A('E016', 'Ravi Kumaran a/l Selvaraj', [['P002', '2021-01-04', null, 'P001', 'HRIS export, row 002', 'high', null]]);
A('E017', 'Sharifah Aznita binti Syed Omar', [['P003', '2021-01-04', null, 'P001', 'HRIS export, row 003', 'high', null]]);
A('E018', 'Wong Kah Meng', [['P004', '2021-01-04', null, 'P001', 'HRIS export, row 004', 'high', null]]);
A('E019', 'Hafizah binti Mohd Noor', [['P005', '2021-01-04', null, 'P001', 'HRIS export, row 005', 'high', null]]);
A('E020', 'Christopher Lai Zhen Hao', [['P006', '2021-01-04', null, 'P001', 'HRIS export, row 006', 'high', null]]);
A('E021', 'Ustaz Faizal bin Abdul Latif', [['P007', '2021-01-04', null, 'P001', 'HRIS export, row 007', 'high', null]]);
A('E022', 'Melissa Chong Sue Lin', [['P008', '2021-01-04', null, 'P001', 'HRIS export, row 008', 'high', null]]);
A('E023', 'Shahrul Nizam bin Abdullah', [
  ['P210', '2021-02-01', '2022-03-31', 'P002', 'HRIS export, row 210', 'high', null],
  ['P009', '2022-04-01', null, 'P001', 'Appointment letter dated 21 Mar 2022', 'high', 'Promoted to lead new division'],
]);

/* -- The wider organisation: one seat each, straightforward histories. ---- */
const simple = [
  ['E024', 'Amirul Hakim bin Roslan', 'P511', '2021-01-04'],
  ['E025', 'Chong Mei Yee', 'P512', '2022-02-01'],
  ['E026', 'Kavitha a/p Ramasamy', 'P513', '2021-06-01'],
  ['E027', 'Izzat Haiqal bin Suhaimi', 'P514', '2021-01-04'],
  ['E028', 'Lee Chun Kit', 'P515', '2022-05-02'],
  ['E029', 'Zainab binti Othman', 'P516', '2021-01-04'],
  ['E030', 'Ng Hui Shan', 'P517', '2021-09-01'],
  ['E031', 'Thulasi a/p Krishnan', 'P518', '2023-08-01'],
  ['E032', 'Faiz Iskandar bin Mansor', 'P519', '2021-04-01'],
  ['E033', 'Rachel Teoh Sze Wei', 'P211', '2021-05-03'],
  ['E034', 'Hakim Zulfadli bin Rahim', 'P212', '2023-02-01'],
  ['E035', 'Vincent Chua Boon Hock', 'P213', '2021-03-01'],
  ['E036', 'Siti Aisyah binti Jamaludin', 'P214', '2021-03-01'],
  ['E037', 'Adriana Yap Li Ching', 'P216', '2022-01-04'],
  ['E038', 'Meor Hafiz bin Kamal', 'P217', '2023-03-01'],
  ['E039', 'Roslinda binti Ahmad', 'P110', '2021-01-04'],
  ['E040', 'Koh Beng Huat', 'P111', '2021-01-04'],
  ['E041', 'Norazlin binti Mat Yusof', 'P112', '2021-01-04'],
  ['E042', 'Jeffrey Chin Fook Onn', 'P113', '2022-08-01'],
  ['E043', 'Umi Kalthum binti Draman', 'P114', '2021-01-04'],
  ['E044', 'Loh Sin Yee', 'P115', '2021-01-04'],
  ['E045', 'Danish Iman bin Azmi', 'P116', '2021-02-01'],
  ['E046', 'Anand a/l Muthusamy', 'P117', '2021-01-04'],
  ['E047', 'Yasmin binti Zulkifli', 'P118', '2022-03-01'],
  ['E048', 'Terence Foo Wai Keong', 'P310', '2021-01-04'],
  ['E049', 'Nabila binti Shamsuddin', 'P311', '2021-01-04'],
  ['E050', 'Vijaya a/p Balakrishnan', 'P312', '2021-01-04'],
  ['E051', 'Haziq Aiman bin Rosli', 'P910', '2021-01-04'],
  ['E052', 'Grace Lim Poh Ling', 'P911', '2021-01-04'],
  ['E053', 'Aziz bin Hassan', 'P912', '2021-01-04'],
  ['E054', 'Charmaine Soh Yi Xuan', 'P913', '2021-08-02'],
  ['E055', 'Suraya binti Kamaruzaman', 'P710', '2021-01-04'],
  ['E056', 'Bryan Tay Chee Keong', 'P711', '2021-01-04'],
  ['E057', 'Intan Nadia binti Salleh', 'P712', '2022-01-04'],
  ['E058', 'Marcus Lim Wei Jie', 'P810', '2021-01-04'],
  ['E059', 'Hasnah binti Ismail', 'P811', '2021-01-04'],
  ['E060', 'Elaine Kwan Mei Fong', 'P812', '2022-09-01'],
  ['E061', 'Zulhilmi bin Abd Karim', 'P820', '2021-01-04'],
  ['E062', 'Serena Wong Xin Yi', 'P821', '2021-01-04'],
  ['E063', 'Ganesh a/l Pillai', 'P822', '2021-11-01'],
];

for (const [pid, name, positionId, start] of simple) {
  A(pid, name, [[positionId, start, null, positions.find((p) => p.id === positionId)?.reports ?? null,
    `HRIS export, row ${positionId.slice(1)}`, 'high', null]]);
}

// One recruiter whose position was later abolished by the HR merge.
A('E064', 'Nurin Sofea binti Hairul', [
  ['P713', '2021-01-04', '2024-06-30', 'P701', 'HRIS export, row 713', 'high', null],
]);

/* ------------------------------------------------------------------ *
 * 5. Planted data-quality defects. Each maps to one IssueKind.
 * ------------------------------------------------------------------ */

// CONFLICT — two sources describe the same period with different managers.
// The org chart still shows the old CTO line; the transfer letter names the
// new Head of Group Digital. Both are in the file. We refuse to pick.
people.find((p) => p.personId === 'E035').spans.push(
  ['P213', '2021-03-01', null, 'P002', 'Org chart 2023 (PowerPoint)', 'low', 'Reporting line per org chart'],
);

// MISSING — a seat nobody ever recorded a manager against.
P({ id: 'P920', title: 'Sustainability Reporting Officer', unit: 'Regulatory Compliance', div: 'Group Risk & Compliance', level: 3, loc: KL, created: '2023-05-02' });
A('E065', 'Puteri Balqis binti Anuar', [
  ['P920', '2023-05-02', null, null, 'Headcount spreadsheet 2023 (no manager column)', 'medium', null],
]);

// INFERRED — no creation date on the position, so we derive it and say so.
P({ id: 'P921', title: 'Digital Onboarding Specialist', unit: 'Digital Product', div: 'Group Digital', level: 3, loc: BGS, created: null, reports: 'P009' });
A('E066', 'Khairul Anwar bin Jamil', [
  ['P921', '2022-11-01', null, 'P009', 'Headcount spreadsheet 2022 (undated)', 'medium', null],
]);

// INCONSISTENT — an assignment running past the life of its own position.
A('E067', 'Low Wai Kit', [
  ['P301', '2021-04-01', '2024-03-31', 'P003', 'Payroll extract 2024 Q1', 'medium', null],
]);

/** Index built only after every position is declared. */
const posById = new Map(positions.map((p) => [p.id, p]));

/* ------------------------------------------------------------------ *
 * 6. Emit.
 * ------------------------------------------------------------------ */
const HEADERS = [
  'person_id', 'person_name', 'position_id', 'position_title', 'org_unit', 'division',
  'level', 'location', 'employment_type', 'position_created', 'position_closed',
  'start_date', 'end_date', 'reports_to_position', 'predecessor_positions',
  'change_reason', 'source', 'confidence',
];

const esc = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const lines = [HEADERS.join(',')];
let rowCount = 0;

for (const person of people) {
  for (const [positionId, start, end, reports, source, confidence, reason] of person.spans) {
    const pos = posById.get(positionId);
    if (!pos) throw new Error(`Unknown position ${positionId} for ${person.personId}`);
    lines.push([
      person.personId, person.name, pos.id, pos.title, pos.unit, pos.div,
      pos.level ?? '', pos.loc ?? '', 'Permanent',
      pos.created ?? '', pos.closed ?? '',
      start, end ?? '', reports ?? '', (pos.preds ?? []).join(';'),
      reason ?? '', source, confidence,
    ].map(esc).join(','));
    rowCount++;
  }
}

const csv = lines.join('\n');

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  `/**\n` +
  ` * GENERATED FILE — do not edit by hand.\n` +
  ` * Produced by scripts/generate-dataset.mjs. Run \`npm run generate:data\`.\n` +
  ` *\n` +
  ` * SYNTHETIC DATA. Shaped like a large Malaysian bank so the demonstration is\n` +
  ` * legible to a local audience. Every person, position, date and document\n` +
  ` * reference was invented for this project. It contains no real employment\n` +
  ` * records and is not affiliated with or endorsed by any bank.\n` +
  ` */\n\n` +
  `export const DEMO_DATASET_LABEL = 'Maybank (illustrative) \u00b7 synthetic';\n\n` +
  `export const DEMO_DATASET_CSV = \`${csv.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;\n`,
  'utf8',
);

console.log(`Wrote ${OUT}`);
console.log(`  positions: ${positions.length}`);
console.log(`  people:    ${people.length}`);
console.log(`  rows:      ${rowCount}`);
