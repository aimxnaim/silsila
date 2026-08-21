/**
 * GENERATED FILE — do not edit by hand.
 * Produced by scripts/generate-dataset.mjs. Run `npm run generate:data`.
 *
 * SYNTHETIC DATA. Shaped like a large Malaysian bank so the demonstration is
 * legible to a local audience. Every person, position, date and document
 * reference was invented for this project. It contains no real employment
 * records and is not affiliated with or endorsed by any bank.
 */

export const DEMO_DATASET_LABEL = 'Maybank (illustrative) · synthetic';

export const DEMO_DATASET_CSV = `person_id,person_name,position_id,position_title,org_unit,division,level,location,employment_type,position_created,position_closed,start_date,end_date,reports_to_position,predecessor_positions,change_reason,source,confidence
E001,Nurul Huda binti Rashid,P101,Branch Operations Executive,Branch Operations,Community Financial Services,2,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,2022-06-30,2021-01-04,2022-06-30,P004,,Initial appointment,"HRIS export, row 214",high
E001,Nurul Huda binti Rashid,P102,Branch Operations Specialist,Branch Operations,Community Financial Services,2,"Menara Maybank, Kuala Lumpur",Permanent,2022-07-01,2023-12-31,2022-07-01,2023-12-31,P004,P101,Title standardisation,Redesignation letter dated 14 Jun 2022,high
E001,Nurul Huda binti Rashid,P103,Branch Experience Specialist,Branch Operations,Community Financial Services,3,"Menara Maybank, Kuala Lumpur",Permanent,2024-01-01,,2024-01-01,,P004,P102,"Redesignation, grade 2 to 3","HRIS export, row 217",high
E002,Cheah Wan Xin,P201,Digital Channels Manager,Digital Product,Group Digital,5,"Bangsar South, Kuala Lumpur",Permanent,2021-01-04,2022-12-31,2021-01-04,2022-12-31,P002,,Initial appointment,"HRIS export, row 088",high
E002,Cheah Wan Xin,P202,Mobile Banking Manager,Mobile Banking,Group Digital,5,"Bangsar South, Kuala Lumpur",Permanent,2023-01-01,,2023-01-01,,P009,P201,Channel split,Restructuring memo dated 12 Dec 2022,high
E003,Tan Wei Ming,P215,Frontend Engineer,Web Channels,Group Digital,3,"Bangsar South, Kuala Lumpur",Permanent,2021-07-01,,2021-07-01,2022-12-31,P201,,,"HRIS export, row 143",high
E003,Tan Wei Ming,P203,Web Channels Manager,Web Channels,Group Digital,5,"Bangsar South, Kuala Lumpur",Permanent,2023-01-01,,2023-01-01,,P009,P201,Promoted into new seat,Restructuring memo dated 12 Dec 2022,high
E004,Muhammad Aiman Naim bin Mohd Faizul,P302,Payments Operations Lead,Payments Operations,Group Operations,5,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,2023-12-31,2021-01-04,2023-12-31,P003,,,"HRIS export, row 301",high
E004,Muhammad Aiman Naim bin Mohd Faizul,P303,Payments & Cards Operations Lead,Payments Operations,Group Operations,5,"Menara Maybank, Kuala Lumpur",Permanent,2024-01-01,,2024-01-01,,P003,P301;P302,Merged role,Consolidation notice dated 20 Nov 2023,high
E005,Joanne Ngai Shi Ying,P301,Cards Operations Lead,Cards Operations,Group Operations,5,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,2023-12-31,2021-01-04,2023-12-31,P003,,,"HRIS export, row 302",high
E005,Joanne Ngai Shi Ying,P313,Process Improvement Lead,Group Operations,Group Operations,5,"Menara Maybank, Kuala Lumpur",Permanent,2022-06-01,,2024-01-01,,P003,,Redeployed after consolidation,Internal transfer letter dated 04 Dec 2023,high
E006,Sivakumar a/l Rajendran,P401,"Regional Sales Manager, Northern",Retail Distribution,Community Financial Services,5,Penang,Permanent,2021-01-04,2023-06-30,2021-01-04,2023-06-30,P004,,,"HRIS export, row 410",high
E006,Sivakumar a/l Rajendran,P402,Territory Growth Lead,Retail Distribution,Community Financial Services,5,Penang,Permanent,2023-07-01,,2023-07-01,,P004,P401,Role redefined,Org chart 2023 (PowerPoint),low
E007,Lim Jia Hui,P501,Infrastructure Engineer,Cloud & Infrastructure,Group Technology,3,Maybank Cyberjaya,Permanent,2021-01-04,2022-09-30,2021-01-04,2022-09-30,P002,,,"HRIS export, row 501",high
E007,Lim Jia Hui,P502,Cloud Platform Engineer,Cloud & Infrastructure,Group Technology,3,Maybank Cyberjaya,Permanent,2022-10-01,,2022-10-01,,P002,P501,Specialised into cloud,"Cloud migration restructure, Sep 2022",high
E008,Arif Danial bin Zulkarnain,P510,Site Reliability Engineer,Cloud & Infrastructure,Group Technology,3,Maybank Cyberjaya,Permanent,2021-03-01,,2021-03-01,2022-09-30,P002,,,"HRIS export, row 505",high
E008,Arif Danial bin Zulkarnain,P503,Network Operations Engineer,Cloud & Infrastructure,Group Technology,3,Maybank Cyberjaya,Permanent,2022-10-01,,2022-10-01,,P002,P501,Specialised into network,"Cloud migration restructure, Sep 2022",high
E009,Priya Devi a/p Manickam,P601,Data Analyst,Data & Analytics,Group Technology,3,Maybank Cyberjaya,Permanent,2021-01-04,2023-03-31,2021-01-04,2023-03-31,P002,,,"HRIS export, row 601",high
E009,Priya Devi a/p Manickam,P602,Data Scientist,Data & Analytics,Group Technology,4,Maybank Cyberjaya,Permanent,2023-04-01,,2023-04-01,,P002,P601,Grade 3 to 4,Redesignation letter dated 20 Mar 2023,high
E010,Farah Adlina binti Hamzah,P701,Talent Acquisition Lead,Talent & Rewards,Group Human Capital,5,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,2024-06-30,2021-01-04,2024-06-30,P006,,,"HRIS export, row 701",high
E010,Farah Adlina binti Hamzah,P703,Talent & Development Lead,Talent & Rewards,Group Human Capital,5,"Menara Maybank, Kuala Lumpur",Permanent,2024-07-01,,2024-07-01,,P006,P701;P702,Merged role,Consolidation notice dated 15 May 2024,high
E011,Gopal a/l Subramaniam,P702,Learning & Development Lead,Organisational Development,Group Human Capital,5,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,2024-06-30,2021-01-04,2024-06-30,P006,,,"HRIS export, row 702",high
E012,Yeoh Kai Sheng,P801,Head of AI Enablement,Data & Analytics,Group Technology,6,Maybank Cyberjaya,Permanent,2025-01-06,,2025-01-06,,P002,,External hire,"HRIS export, row 801",high
E013,Nur Alia binti Kamarudin,P802,Machine Learning Engineer,Data & Analytics,Group Technology,4,Maybank Cyberjaya,Permanent,2025-02-03,,2025-02-03,,P801,,External hire,"HRIS export, row 802",high
E014,Daniel Ong Zhi Wei,P803,AI Governance Specialist,Regulatory Compliance,Group Risk & Compliance,4,"Menara Maybank, Kuala Lumpur",Permanent,2025-04-01,,2025-04-01,,P005,,External hire,"HRIS export, row 803",high
E015,Dato’ Rahman bin Ibrahim,P001,Group Chief Executive Officer,Executive,Group Executive,9,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-01,,2021-01-04,,,,,"HRIS export, row 001",high
E016,Ravi Kumaran a/l Selvaraj,P002,Group Chief Technology Officer,Executive,Group Technology,8,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-01,,2021-01-04,,P001,,,"HRIS export, row 002",high
E017,Sharifah Aznita binti Syed Omar,P003,Group Chief Operating Officer,Executive,Group Operations,8,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-01,,2021-01-04,,P001,,,"HRIS export, row 003",high
E018,Wong Kah Meng,P004,Head of Community Financial Services,Executive,Community Financial Services,8,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-01,,2021-01-04,,P001,,,"HRIS export, row 004",high
E019,Hafizah binti Mohd Noor,P005,Group Chief Risk Officer,Executive,Group Risk & Compliance,8,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-01,,2021-01-04,,P001,,,"HRIS export, row 005",high
E020,Christopher Lai Zhen Hao,P006,Group Chief Human Capital Officer,Executive,Group Human Capital,8,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-01,,2021-01-04,,P001,,,"HRIS export, row 006",high
E021,Ustaz Faizal bin Abdul Latif,P007,Head of Islamic Banking,Executive,Islamic Banking,8,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-01,,2021-01-04,,P001,,,"HRIS export, row 007",high
E022,Melissa Chong Sue Lin,P008,Head of Global Banking,Executive,Global Banking,8,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-01,,2021-01-04,,P001,,,"HRIS export, row 008",high
E023,Shahrul Nizam bin Abdullah,P210,"Product Manager, MAE",Mobile Banking,Group Digital,4,"Bangsar South, Kuala Lumpur",Permanent,2021-02-01,,2021-02-01,2022-03-31,P002,,,"HRIS export, row 210",high
E023,Shahrul Nizam bin Abdullah,P009,Head of Group Digital,Executive,Group Digital,8,"Bangsar South, Kuala Lumpur",Permanent,2022-04-01,,2022-04-01,,P001,,Promoted to lead new division,Appointment letter dated 21 Mar 2022,high
E024,Amirul Hakim bin Roslan,P511,Core Banking Engineer,Core Banking Platforms,Group Technology,3,Maybank Cyberjaya,Permanent,2021-01-04,,2021-01-04,,P002,,,"HRIS export, row 511",high
E025,Chong Mei Yee,P512,Core Banking Engineer II,Core Banking Platforms,Group Technology,4,Maybank Cyberjaya,Permanent,2022-02-01,,2022-02-01,,P002,,,"HRIS export, row 512",high
E026,Kavitha a/p Ramasamy,P513,Integration Engineer,Core Banking Platforms,Group Technology,3,Maybank Cyberjaya,Permanent,2021-06-01,,2021-06-01,,P002,,,"HRIS export, row 513",high
E027,Izzat Haiqal bin Suhaimi,P514,Security Operations Analyst,Cybersecurity,Group Technology,3,Maybank Cyberjaya,Permanent,2021-01-04,,2021-01-04,,P002,,,"HRIS export, row 514",high
E028,Lee Chun Kit,P515,Security Engineer,Cybersecurity,Group Technology,4,Maybank Cyberjaya,Permanent,2022-05-02,,2022-05-02,,P002,,,"HRIS export, row 515",high
E029,Zainab binti Othman,P516,Head of Cybersecurity,Cybersecurity,Group Technology,6,Maybank Cyberjaya,Permanent,2021-01-04,,2021-01-04,,P002,,,"HRIS export, row 516",high
E030,Ng Hui Shan,P517,Data Engineer,Data & Analytics,Group Technology,3,Maybank Cyberjaya,Permanent,2021-09-01,,2021-09-01,,P002,,,"HRIS export, row 517",high
E031,Thulasi a/p Krishnan,P518,Analytics Translator,Data & Analytics,Group Technology,3,Maybank Cyberjaya,Permanent,2023-08-01,,2023-08-01,,P002,,,"HRIS export, row 518",high
E032,Faiz Iskandar bin Mansor,P519,QA Automation Engineer,Core Banking Platforms,Group Technology,3,Maybank Cyberjaya,Permanent,2021-04-01,,2021-04-01,,P002,,,"HRIS export, row 519",high
E033,Rachel Teoh Sze Wei,P211,Product Designer,Digital Product,Group Digital,3,"Bangsar South, Kuala Lumpur",Permanent,2021-05-03,,2021-05-03,,P009,,,"HRIS export, row 211",high
E034,Hakim Zulfadli bin Rahim,P212,Senior Product Designer,Digital Product,Group Digital,4,"Bangsar South, Kuala Lumpur",Permanent,2023-02-01,,2023-02-01,,P009,,,"HRIS export, row 212",high
E035,Vincent Chua Boon Hock,P213,iOS Engineer,Mobile Banking,Group Digital,3,"Bangsar South, Kuala Lumpur",Permanent,2021-03-01,,2021-03-01,,P202,,,"HRIS export, row 213",high
E035,Vincent Chua Boon Hock,P213,iOS Engineer,Mobile Banking,Group Digital,3,"Bangsar South, Kuala Lumpur",Permanent,2021-03-01,,2021-03-01,,P002,,Reporting line per org chart,Org chart 2023 (PowerPoint),low
E036,Siti Aisyah binti Jamaludin,P214,Android Engineer,Mobile Banking,Group Digital,3,"Bangsar South, Kuala Lumpur",Permanent,2021-03-01,,2021-03-01,,P202,,,"HRIS export, row 214",high
E037,Adriana Yap Li Ching,P216,Digital Marketing Executive,Digital Product,Group Digital,2,"Bangsar South, Kuala Lumpur",Permanent,2022-01-04,,2022-01-04,,P009,,,"HRIS export, row 216",high
E038,Meor Hafiz bin Kamal,P217,Growth Analyst,Digital Product,Group Digital,3,"Bangsar South, Kuala Lumpur",Permanent,2023-03-01,,2023-03-01,,P009,,,"HRIS export, row 217",high
E039,Roslinda binti Ahmad,P110,"Branch Manager, Jalan Tuanku",Branch Operations,Community Financial Services,4,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P004,,,"HRIS export, row 110",high
E040,Koh Beng Huat,P111,"Branch Manager, Georgetown",Branch Operations,Community Financial Services,4,Penang,Permanent,2021-01-04,,2021-01-04,,P004,,,"HRIS export, row 111",high
E041,Norazlin binti Mat Yusof,P112,"Branch Manager, Johor Bahru City",Branch Operations,Community Financial Services,4,Johor Bahru,Permanent,2021-01-04,,2021-01-04,,P004,,,"HRIS export, row 112",high
E042,Jeffrey Chin Fook Onn,P113,"Branch Manager, Kota Kinabalu",Branch Operations,Community Financial Services,4,Kota Kinabalu,Permanent,2022-08-01,,2022-08-01,,P004,,,"HRIS export, row 113",high
E043,Umi Kalthum binti Draman,P114,Customer Service Executive,Branch Operations,Community Financial Services,2,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P110,,,"HRIS export, row 114",high
E044,Loh Sin Yee,P115,SME Relationship Manager,SME Banking,Community Financial Services,4,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P004,,,"HRIS export, row 115",high
E045,Danish Iman bin Azmi,P116,SME Credit Analyst,SME Banking,Community Financial Services,3,"Menara Maybank, Kuala Lumpur",Permanent,2021-02-01,,2021-02-01,,P115,,,"HRIS export, row 116",high
E046,Anand a/l Muthusamy,P117,Head of SME Banking,SME Banking,Community Financial Services,6,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P004,,,"HRIS export, row 117",high
E047,Yasmin binti Zulkifli,P118,Retail Product Manager,Retail Distribution,Community Financial Services,4,"Menara Maybank, Kuala Lumpur",Permanent,2022-03-01,,2022-03-01,,P004,,,"HRIS export, row 118",high
E048,Terence Foo Wai Keong,P310,Payments Operations Analyst,Payments Operations,Group Operations,2,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P302,,,"HRIS export, row 310",high
E049,Nabila binti Shamsuddin,P311,Settlement Officer,Payments Operations,Group Operations,2,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P302,,,"HRIS export, row 311",high
E050,Vijaya a/p Balakrishnan,P312,Cards Dispute Officer,Cards Operations,Group Operations,2,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P301,,,"HRIS export, row 312",high
E051,Haziq Aiman bin Rosli,P910,Credit Risk Analyst,Credit Risk,Group Risk & Compliance,3,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P005,,,"HRIS export, row 910",high
E052,Grace Lim Poh Ling,P911,Operational Risk Manager,Operational Risk,Group Risk & Compliance,5,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P005,,,"HRIS export, row 911",high
E053,Aziz bin Hassan,P912,Regulatory Compliance Officer,Regulatory Compliance,Group Risk & Compliance,3,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P005,,,"HRIS export, row 912",high
E054,Charmaine Soh Yi Xuan,P913,AML Analyst,Regulatory Compliance,Group Risk & Compliance,3,"Menara Maybank, Kuala Lumpur",Permanent,2021-08-02,,2021-08-02,,P005,,,"HRIS export, row 913",high
E055,Suraya binti Kamaruzaman,P710,"HR Business Partner, Technology",Talent & Rewards,Group Human Capital,4,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P006,,,"HRIS export, row 710",high
E056,Bryan Tay Chee Keong,P711,"HR Business Partner, Retail",Talent & Rewards,Group Human Capital,4,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P006,,,"HRIS export, row 711",high
E057,Intan Nadia binti Salleh,P712,Rewards Analyst,Talent & Rewards,Group Human Capital,3,"Menara Maybank, Kuala Lumpur",Permanent,2022-01-04,,2022-01-04,,P006,,,"HRIS export, row 712",high
E058,Marcus Lim Wei Jie,P810,Shariah Advisory Officer,Shariah Advisory,Islamic Banking,4,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P007,,,"HRIS export, row 810",high
E059,Hasnah binti Ismail,P811,Islamic Product Manager,Islamic Product,Islamic Banking,4,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P007,,,"HRIS export, row 811",high
E060,Elaine Kwan Mei Fong,P812,Takaful Specialist,Islamic Product,Islamic Banking,3,"Menara Maybank, Kuala Lumpur",Permanent,2022-09-01,,2022-09-01,,P007,,,"HRIS export, row 812",high
E061,Zulhilmi bin Abd Karim,P820,Transaction Banking Manager,Transaction Banking,Global Banking,5,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P008,,,"HRIS export, row 820",high
E062,Serena Wong Xin Yi,P821,Corporate Coverage Associate,Corporate Coverage,Global Banking,3,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,,P008,,,"HRIS export, row 821",high
E063,Ganesh a/l Pillai,P822,Trade Finance Specialist,Transaction Banking,Global Banking,3,"Menara Maybank, Kuala Lumpur",Permanent,2021-11-01,,2021-11-01,,P820,,,"HRIS export, row 822",high
E064,Nurin Sofea binti Hairul,P713,Recruiter,Talent & Rewards,Group Human Capital,2,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,,2021-01-04,2024-06-30,P701,,,"HRIS export, row 713",high
E065,Puteri Balqis binti Anuar,P920,Sustainability Reporting Officer,Regulatory Compliance,Group Risk & Compliance,3,"Menara Maybank, Kuala Lumpur",Permanent,2023-05-02,,2023-05-02,,,,,Headcount spreadsheet 2023 (no manager column),medium
E066,Khairul Anwar bin Jamil,P921,Digital Onboarding Specialist,Digital Product,Group Digital,3,"Bangsar South, Kuala Lumpur",Permanent,,,2022-11-01,,P009,,,Headcount spreadsheet 2022 (undated),medium
E067,Low Wai Kit,P301,Cards Operations Lead,Cards Operations,Group Operations,5,"Menara Maybank, Kuala Lumpur",Permanent,2021-01-04,2023-12-31,2021-04-01,2024-03-31,P003,,,Payroll extract 2024 Q1,medium`;
