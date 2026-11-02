const path = require('path');
const fs = require('fs');
const { createDocx } = require('./generate-docx-fixture');
const { createSimpleTextPdf, createEmptyScanPdf } = require('./generate-pdf-fixture');

async function main() {
  const fixturesDir = path.join(__dirname, '..', 'tests', 'fixtures');
  fs.mkdirSync(fixturesDir, { recursive: true });

  const fiveQuestions = [
    '1. In the beginning was the Word, and the Word was with God, and the Word was God. Who does the Word refer to?',
    'A. Jesus Christ',
    'B. Moses',
    'C. Abraham',
    'D. King David',
    'Answer: A',
    'Reference: John 1:1',
    'Explanation: The Word refers to Jesus Christ from eternity.',
    '',
    '2. How many days and nights did it rain during the great flood in the days of Noah?',
    'A. 30 days',
    'B. 40 days',
    'C. 50 days',
    'D. 70 days',
    'Answer: B',
    'Reference: Genesis 7:12',
    'Explanation: The rain was upon the earth forty days and forty nights.',
    '',
    '3. Who was caught up into heaven in a whirlwind by a chariot of fire?',
    'A. Elijah',
    'B. Elisha',
    'C. Enoch',
    'D. Isaiah',
    'Answer: A',
    'Reference: 2 Kings 2:11',
    'Explanation: Elijah went up by a whirlwind into heaven.',
    '',
    '4. According to 1 Peter 3:20, how many souls were saved by water in the ark?',
    'A. Four',
    'B. Six',
    'C. Eight',
    'D. Ten',
    'Answer: C',
    'Reference: 1 Peter 3:20',
    'Explanation: Few, that is, eight souls were saved by water.',
    '',
    '5. What was the first bird that Noah sent out from the ark?',
    'A. A dove',
    'B. A raven',
    'C. A sparrow',
    'D. An eagle',
    'Answer: B',
    'Reference: Genesis 8:7',
    'Explanation: Noah sent forth a raven which went forth to and fro.',
  ];

  // 1. 5-questions.docx (U-A01)
  await createDocx(path.join(fixturesDir, '5-questions.docx'), fiveQuestions);

  // 2. 5-questions.pdf (U-A02)
  createSimpleTextPdf(path.join(fixturesDir, '5-questions.pdf'), fiveQuestions);

  // 3. scanned-empty.pdf (U-A03)
  createEmptyScanPdf(path.join(fixturesDir, 'scanned-empty.pdf'));

  // 4. bad-questions.docx (U-A04)
  const badQuestions = [
    '1. A question with only one option?',
    'A. Only option here',
    'Answer: A',
    'Reference: Genesis 1:1',
    '',
    '2. Question with Answer E but only 4 options A to D?',
    'A. First',
    'B. Second',
    'C. Third',
    'D. Fourth',
    'Answer: E',
    'Reference: Exodus 1:1',
    '',
    '3. Question with missing Answer line?',
    'A. Choice one',
    'B. Choice two',
    'Reference: Leviticus 1:1',
  ];
  await createDocx(path.join(fixturesDir, 'bad-questions.docx'), badQuestions);

  // 5. sample-with-errors.csv (U-A05)
  // 5 rows: 3 valid, 2 deliberate errors (row 2: empty option_b; row 4: correct key 'Z')
  const csvContent = `round_position,round_title,round_type,question,option_a,option_b,option_c,option_d,option_e,correct,scripture_ref,explanation
1,Round 1,speed,Who built the ark?,Moses,Noah,Abraham,David,,B,Genesis 6:14,Noah built the ark
1,Round 1,speed,Question with missing option B?,First,,,Fourth,,A,Genesis 1:1,Missing option B
1,Round 1,speed,How many days did it rain?,30,40,50,70,,B,Genesis 7:12,Forty days and nights
1,Round 1,speed,Question with invalid answer key Z?,Alpha,Beta,Gamma,Delta,,Z,Genesis 1:2,Invalid key Z
1,Round 1,speed,Who led Israel across the Red Sea?,Moses,Joshua,Aaron,Caleb,,A,Exodus 14:21,Moses stretched his hand
`;
  fs.writeFileSync(path.join(fixturesDir, 'sample-with-errors.csv'), csvContent, 'utf-8');

  console.log('All 5 fixtures generated successfully in tests/fixtures/');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

