document.addEventListener('DOMContentLoaded', () => {
  const scanBtn = document.getElementById('scanBtn');
  const htmlInput = document.getElementById('htmlInput');
  const results = document.getElementById('results');

  scanBtn.addEventListener('click', () => {
    const code = htmlInput.value;
    results.innerHTML = '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(code, 'text/html');

    const issues = [];

    // Check 1: Missing alt text
    doc.querySelectorAll('img').forEach(img => {
      if (!img.hasAttribute('alt') || img.getAttribute('alt').trim() === '') {
        issues.push({
          type: "Missing alt text",
          explanation: "Alt text helps screen readers describe images to visually impaired users.",
          fix: "Add alt='Description' to your <img> tags.",
          learnMore: "https://www.w3.org/WAI/tutorials/images/"
        });
      }
    });

    // Check 2: Vague link text
    doc.querySelectorAll('a').forEach(link => {
      const text = link.textContent.trim().toLowerCase();
      if (["click here", "here", "read more"].includes(text)) {
        issues.push({
          type: "Vague link text",
          explanation: "Link text should describe the destination or action clearly.",
          fix: "Use descriptive text like 'Learn about our services'.",
          learnMore: "https://www.w3.org/WAI/WCAG21/Techniques/html/H30"
        });
      }
    });

    // Check 3: Unlabeled inputs
    doc.querySelectorAll('input').forEach(input => {
      const id = input.getAttribute('id');
      const hasLabel = id && doc.querySelector(`label[for="${id}"]`);
      if (!hasLabel) {
        issues.push({
          type: "Unlabeled input field",
          explanation: "Labels help screen readers identify the purpose of form fields.",
          fix: "Add a <label for='inputId'>Label text</label> linked to the input.",
          learnMore: "https://www.w3.org/WAI/tutorials/forms/"
        });
      }
    });

    // Display results
    if (issues.length === 0) {
      results.innerHTML = "<p>No accessibility issues found. Great job!</p>";
    } else {
      issues.forEach(issue => {
        const card = document.createElement('div');
        card.className = 'issue-card';
        card.innerHTML = `
          <h3>${issue.type}</h3>
          <p><strong>Why it matters:</strong> ${issue.explanation}</p>
          <p><strong>Suggested fix:</strong> ${issue.fix}</p>
          <a href="${issue.learnMore}" target="_blank">Learn more</a>
        `;
        results.appendChild(card);
      });
    }
  });
});