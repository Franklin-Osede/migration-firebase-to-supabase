const fs = require('fs');

// Leer el archivo actual
const filePath = './scripts/create-tables-with-rls.js';
let content = fs.readFileSync(filePath, 'utf8');

// Función para extraer tablas de un string SQL
function extractTables(sqlString) {
  const tables = [];
  const createTableRegex = /CREATE TABLE IF NOT EXISTS (\w+)\s*\([^;]+\);/gi;
  let match;
  
  while ((match = createTableRegex.exec(sqlString)) !== null) {
    const tableName = match[1];
    const startIndex = match.index;
    const endIndex = sqlString.indexOf(');', startIndex) + 2;
    const tableSQL = sqlString.substring(startIndex, endIndex);
    
    tables.push({
      name: tableName,
      sql: tableSQL
    });
  }
  
  return tables;
}

// Convertir cada fase
const phases = ['phase5', 'phase6', 'phase7', 'phase8', 'phase9', 'phase10', 'phase11', 'phase12', 'phase13', 'phase14', 'phase15', 'phase16'];

phases.forEach(phase => {
  console.log(`\n🔄 Procesando ${phase}...`);
  
  // Buscar la definición de la fase
  const phaseRegex = new RegExp(`(${phase}:\\s*\\[)([\\s\\S]*?)(\\],)`, 'g');
  const match = phaseRegex.exec(content);
  
  if (match) {
    const phaseContent = match[2];
    
    // Si ya está en formato objeto, saltar
    if (phaseContent.includes('name:') && phaseContent.includes('sql:')) {
      console.log(`✅ ${phase} ya está en formato correcto`);
      return;
    }
    
    // Extraer tablas
    const tables = extractTables(phaseContent);
    
    if (tables.length > 0) {
      // Crear la nueva estructura
      const newPhaseContent = `[
${tables.map(table => `    {
      name: '${table.name}',
      sql: \`${table.sql}\`
    }`).join(',\n\n')}
  ]`;
      
      // Reemplazar en el contenido
      content = content.replace(match[0], `${match[1]}${newPhaseContent}${match[3]}`);
      console.log(`✅ Convertido ${phase}: ${tables.length} tablas`);
    } else {
      console.log(`⚠️  ${phase}: No se encontraron tablas`);
    }
  } else {
    console.log(`❌ ${phase}: No encontrado`);
  }
});

// Escribir el archivo modificado
fs.writeFileSync(filePath, content);
console.log('\n🎉 Conversión de todas las fases completada!');
