const fs = require('fs');

// Leer el archivo actual
const filePath = './scripts/create-tables-with-rls.js';
let content = fs.readFileSync(filePath, 'utf8');

// Corregir arrays anidados [[ -> [
content = content.replace(/phase\d+:\s*\[\[/g, (match) => {
  return match.replace('[[', '[');
});

// Corregir cierres de arrays ]] -> ]
content = content.replace(/\s*\]\],\s*\n\s*\/\/ Fase/g, (match) => {
  return match.replace(']]', ']');
});

// Escribir el archivo modificado
fs.writeFileSync(filePath, content);
console.log('✅ Arrays anidados corregidos!');
