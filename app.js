let questions = [];
let categories = ['All'];
let selectedCategory = 'All';
const answered = new Map();
const escapeHtml = value => value.replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);

const topics = [
  [25, '8086 Architecture'],
  [50, 'Basics & DOS I/O'],
  [70, 'Control Flow'],
  [105, 'Logic, Shift & I/O'],
  [130, 'MUL, DIV & Decimal I/O'],
  [148, 'Stack & Procedures'],
  [170, 'Arrays & Addressing'],
  [180, 'Trainer Kit'],
  [206, 'LCD Interface'],
  [218, '7-Segment & LEDs'],
  [226, 'Dot Matrix'],
  [246, 'Trainer Workflow'],
  [266, 'Machine Code & Formatting'],
  [301, 'LCD Program Tracing'],
  [316, 'Dot-Matrix Tracing'],
  [331, '8086 MCQ Patterns'],
  [366, 'Assembly Code Traps'],
];

const topicFor = number => topics.find(([last]) => number <= last)[1];

function updateStats() {
  document.querySelector('#answered').textContent = answered.size;
  document.querySelector('#correct').textContent = [...answered.values()].filter(answer => answer.correct).length;
  document.querySelector('#total').textContent = questions.length;
}

function render() {
  const filters = document.querySelector('#filters');
  filters.innerHTML = categories.map(category => `<button class="filter ${category === selectedCategory ? 'active' : ''}" data-category="${category}">${category}</button>`).join('');
  filters.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    selectedCategory = button.dataset.category;
    render();
  }));

  const visible = questions.map((question, index) => ({ question, index })).filter(({ question }) => selectedCategory === 'All' || question[0] === selectedCategory);
  const container = document.querySelector('#questions');
  container.innerHTML = '';
  const template = document.querySelector('#question-template');

  visible.forEach(({ question, index }, visibleIndex) => {
    const [category, text, options, correct, explanation] = question;
    const node = template.content.cloneNode(true);
    node.querySelector('.category').textContent = category;
    node.querySelector('.number').textContent = `Question ${visibleIndex + 1}`;
    node.querySelector('.question-text').textContent = text;
    const optionsEl = node.querySelector('.options');
    const feedback = node.querySelector('.feedback');

    options.forEach((option, choice) => {
      const button = document.createElement('button');
      button.className = 'option';
      button.innerHTML = `${String.fromCharCode(65 + choice)}. ${escapeHtml(option)}`;
      if (answered.has(index)) {
        button.disabled = true;
        if (choice === correct) button.classList.add('correct');
        if (choice === answered.get(index).choice && choice !== correct) button.classList.add('wrong');
      }
      button.addEventListener('click', () => answer(index, choice));
      optionsEl.append(button);
    });

    if (answered.has(index)) showFeedback(feedback, correct, options, explanation, answered.get(index).choice);
    container.append(node);
  });
}

function showFeedback(element, correct, options, explanation, choice) {
  const isCorrect = choice === correct;
  element.hidden = false;
  element.className = `feedback ${isCorrect ? 'good' : 'bad'}`;
  const detail = escapeHtml(explanation);
  element.innerHTML = isCorrect
    ? `<strong>Correct.</strong> ${detail}`
    : `<strong>Not quite.</strong> The correct answer is <strong>${String.fromCharCode(65 + correct)}. ${escapeHtml(options[correct])}</strong>. ${detail}`;
}

function answer(index, choice) {
  if (answered.has(index)) return;
  answered.set(index, { choice, correct: choice === questions[index][3] });
  updateStats();
  render();
}

async function loadMasterBank() {
  try {
    const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
    const pdf = await pdfjsLib.getDocument('MMA_Lab_Quiz_Updated_Master_MCQs_366.pdf').promise;
    const pages = await Promise.all(Array.from({ length: pdf.numPages }, async (_, index) => {
      const page = await pdf.getPage(index + 1);
      const content = await page.getTextContent();
      return content.items.map(item => item.str).join(' ');
    }));
    const source = pages.slice(3, 69).join(' ').replace(/CSE 306 - MMA Lab Quiz Master Note|MIST \| 366 unique syllabus-filtered MCQs/g, ' ');
    const parsed = [];
    let cursor = 0;
    for (let number = 1; number <= 366; number += 1) {
      const next = number < 366 ? `(?=\\s+${number + 1}\\.\\s+)` : '$';
      const pattern = new RegExp(`(?:^|\\s)${number}\\.\\s+([\\s\\S]*?)\\s+A\\.\\s+([\\s\\S]*?)\\s+B\\.\\s+([\\s\\S]*?)\\s+C\\.\\s+([\\s\\S]*?)\\s+D\\.\\s+([\\s\\S]*?)\\s+Answer:\\s*([A-D])\\s*\\|\\s*([\\s\\S]*?)${next}`);
      const match = pattern.exec(source.slice(cursor));
      if (!match) throw new Error(`Question parsing failed at ${number}`);
      parsed.push([
        topicFor(number),
        match[1].trim(),
        [match[2].trim(), match[3].trim(), match[4].trim(), match[5].trim()],
        match[6].charCodeAt(0) - 65,
        match[7].trim(),
      ]);
      cursor += match.index + match[0].length;
    }
    questions = parsed;
    categories = ['All', ...new Set(parsed.map(([category]) => category))];
  } catch (error) {
    console.error(error);
    document.querySelector('.intro').textContent = 'The question bank could not load. Check your internet connection and refresh.';
  }
  updateStats();
  render();
}

loadMasterBank();
