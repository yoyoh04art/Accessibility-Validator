// === Contrast Ratio Utilities ===
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const bigint = parseInt(hex, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function luminance([r, g, b]) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrastRatio(fgHex, bgHex) {
  const fgLum = luminance(hexToRgb(fgHex));
  const bgLum = luminance(hexToRgb(bgHex));
  return (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
}

document.getElementById('validatorForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const htmlInput = document.getElementById('htmlInput').value;
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlInput, 'text/html');

  let issueCount = 0;

  function addResult(message, type) {
    const result = document.createElement('div');
    result.classList.add('result', type);
    result.innerHTML = message;
    resultsDiv.appendChild(result);
    if (type === 'error' || type === 'warning') issueCount++;
  }

  // === Alt Text Check ===
  doc.querySelectorAll('img').forEach(img => {
    const alt = img.getAttribute('alt');
    if (!alt || alt.trim() === '') {
      addResult(`❌ Image missing alt text (src: ${img.getAttribute('src') || '[no src]'})`, 'error');
    }
  });

  // === Heading Structure Check ===
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let h1Count = 0;
  let headingLevels = [];

  headings.forEach(h => {
    const level = parseInt(h.tagName.substring(1));
    headingLevels.push(level);
    if (level === 1) h1Count++;
  });

  if (h1Count === 0) addResult('❌ No <h1> tag found.', 'error');
  if (h1Count > 1) addResult(`⚠️ ${h1Count} <h1> tags found.`, 'warning');

  for (let i = 1; i < headingLevels.length; i++) {
    if (Math.abs(headingLevels[i] - headingLevels[i - 1]) > 1) {
      addResult(`⚠️ Heading level jump between <h${headingLevels[i - 1]}> and <h${headingLevels[i]}>.`, 'warning');
      break;
    }
  }

  if (h1Count === 1 && headingLevels.every((lvl, i, arr) => i === 0 || lvl - arr[i - 1] <= 1)) {
    addResult('✅ Heading structure looks good.', 'success');
  }

  // === Form Label Check ===
  doc.querySelectorAll('input, textarea, select').forEach(el => {
    const id = el.getAttribute('id');
    const ariaLabel = el.getAttribute('aria-label');
    const hasLabel = (id && doc.querySelector(`label[for="${id}"]`)) || (ariaLabel && ariaLabel.trim() !== '');
    if (!hasLabel) {
      addResult(`❌ Unlabeled ${el.tagName.toLowerCase()} field (type: ${el.getAttribute('type') || 'text'}).`, 'error');
    }
  });

  // === Link Accessibility Check ===
  const vaguePhrases = ['click here', 'read more', 'more', 'link'];
  doc.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href');
    const text = (link.textContent || '').trim().toLowerCase();
    if (!href || href.trim() === '') {
      addResult('❌ Link missing href attribute.', 'error');
    } else if (vaguePhrases.includes(text)) {
      addResult(`⚠️ Vague link text: "${link.textContent}".`, 'warning');
    }
  });

  // === Refined Contrast Check ===
  doc.querySelectorAll('[style]').forEach(el => {
    const style = el.getAttribute('style');
    const colorMatch = style.match(/color:\s*(#[0-9a-fA-F]{3,6})/);
    const bgMatch = style.match(/background-color:\s*(#[0-9a-fA-F]{3,6})/);
    if (colorMatch && bgMatch) {
      const fg = colorMatch[1];
      const bg = bgMatch[1];
      const ratio = contrastRatio(fg, bg);
      if (ratio < 4.5) {
        addResult(`❌ Contrast ratio ${ratio.toFixed(2)}:1 between ${fg} and ${bg} is too low.`, 'error');
      } else {
        addResult(`✅ Contrast ratio ${ratio.toFixed(2)}:1 between ${fg} and ${bg} is sufficient.`, 'success');
      }
    }
  });

  // === Landmark Role Check ===
  const landmarks = ['main', 'nav', 'header', 'footer', 'aside', 'section', 'article'];
  const foundLandmarks = landmarks.filter(tag => doc.querySelector(tag));
  if (!doc.querySelector('main')) {
    addResult('⚠️ No <main> landmark found.', 'warning');
  }
  if (foundLandmarks.length === 0) {
    addResult('❌ No landmark roles detected.', 'error');
  } else {
    addResult(`✅ Landmark roles detected: ${foundLandmarks.map(tag => `<${tag}>`).join(', ')}`, 'success');
  }

  // === ARIA Attribute Validation ===
  const validAria = [
    'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden',
    'aria-expanded', 'aria-checked', 'aria-selected', 'aria-disabled',
    'aria-required', 'aria-invalid', 'aria-busy', 'aria-live'
  ];
  doc.querySelectorAll('[aria-label], [aria-labelledby], [aria-hidden], [role]').forEach(el => {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role');
    const ariaHidden = el.getAttribute('aria-hidden');
    const ariaLabel = el.getAttribute('aria-label');
    const ariaLabelledby = el.getAttribute('aria-labelledby');

    if (ariaHidden === 'true' && ['button', 'a', 'input', 'select', 'textarea'].includes(tag)) {
      addResult(`⚠️ ${tag} element is interactive but aria-hidden="true".`, 'warning');
    }

    if (role && !ariaLabel && !ariaLabelledby) {
      addResult(`⚠️ ${tag} with role="${role}" missing accessible label.`, 'warning');
    }

    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('aria-') && !validAria.includes(attr.name)) {
        addResult(`❌ Invalid ARIA attribute "${attr.name}" on <${tag}>.`, 'error');
      }
    });
  });

  // === Fieldset and Legend Grouping Check ===
  const groupedInputs = [...doc.querySelectorAll('input[type="radio"]'), ...doc.querySelectorAll('input[type="checkbox"]')];
  groupedInputs.forEach(input => {
    let parent = input.parentElement;
    let insideFieldset = false;
    let hasLegend = false;
    while (parent) {
      if (parent.tagName.toLowerCase() === 'fieldset') {
        insideFieldset = true;
        hasLegend = !!parent.querySelector('legend');
        break;
      }
      parent = parent.parentElement;
    }
    if (!insideFieldset) {
      addResult(`⚠️ ${input.type} input should be inside a <fieldset>.`, 'warning');
    } else if (!hasLegend) {
      addResult(`⚠️ ${input.type} input is in <fieldset> but missing <legend>.`, 'warning');
    }
  });

  // === Final Summary ===
  const summary = document.createElement('div');
  summary.classList.add('result', issueCount > 0 ? 'warning' : 'success');
  summary.innerHTML = `✅ Scan complete: ${issueCount} issue${issueCount !== 1 ? 's' : ''} found.`;
  resultsDiv.appendChild(summary);
});