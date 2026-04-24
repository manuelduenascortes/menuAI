const fs = require('fs');
const path = require('path');

const replacements = {
  // Uppercase UI strings
  '\\bDescripcion\\b': 'Descripción',
  '\\bDireccion\\b': 'Dirección',
  '\\bTelefono\\b': 'Teléfono',
  '\\bConfiguracion\\b': 'Configuración',
  '\\bSesion\\b': 'Sesión',
  '\\bAlergenos\\b': 'Alérgenos',
  '\\bAnadir\\b': 'Añadir',
  '\\bInformacion\\b': 'Información',
  '\\bVersion\\b': 'Versión',
  '\\bExito\\b': 'Éxito',
  '\\bAutomatico\\b': 'Automático',
  '\\bAutomatica\\b': 'Automática',
  '\\bPublico\\b': 'Público',
  '\\bPublica\\b': 'Pública',
  '\\bTambien\\b': 'También',
  '\\bAqui\\b': 'Aquí',
  '\\bUnico\\b': 'Único',
  '\\bUnica\\b': 'Única',
  '\\bBasico\\b': 'Básico',
  '\\bBasica\\b': 'Básica',
  '\\bProximo\\b': 'Próximo',
  '\\bUltimo\\b': 'Último',
  '\\bUltima\\b': 'Última',
  '\\bOpcion\\b': 'Opción',
  '\\bBoton\\b': 'Botón',
  '\\bAtras\\b': 'Atrás',
  '\\bMas\\b': 'Más',

  // Lowercase
  '\\bdescripcion\\b': 'descripción',
  '\\bdireccion\\b': 'dirección',
  '\\btelefono\\b': 'teléfono',
  '\\bconfiguracion\\b': 'configuración',
  '\\bsesion\\b': 'sesión',
  '\\balergenos\\b': 'alérgenos',
  '\\banadir\\b': 'añadir',
  '\\binformacion\\b': 'información',
  '\\bversion\\b': 'versión',
  '\\bexito\\b': 'éxito',
  '\\bautomatico\\b': 'automático',
  '\\bautomatica\\b': 'automática',
  '\\bpublico\\b': 'público',
  '\\bpublica\\b': 'pública',
  '\\btambien\\b': 'también',
  '\\baqui\\b': 'aquí',
  '\\bunico\\b': 'único',
  '\\bunica\\b': 'única',
  '\\bbasico\\b': 'básico',
  '\\bbasica\\b': 'básica',
  '\\bproximo\\b': 'próximo',
  '\\bultimo\\b': 'último',
  '\\bultima\\b': 'última',
  '\\bopcion\\b': 'opción',
  '\\bboton\\b': 'botón',
  '\\batras\\b': 'atrás',
  
  // Custom context for "Menu/menu" to avoid replacing component names, variables, and "MenuAI"
  '\\b(el|un|del|su|tu|la) menu\\b': '$1 menú',
  '\\b(El|Un|Del|Su|Tu|La) menu\\b': '$1 menú',
  '\\b(El|Un|Del|Su|Tu|La) Menu\\b': '$1 Menú',
  '>Menu<': '>Menú<',
  '\\bMenu principal\\b': 'Menú principal',
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

const dirToWalk = path.join(__dirname, 'src');
let filesModified = 0;

walkDir(dirToWalk, (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(key, 'g');
      content = content.replace(regex, value);
    }

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Modified: ${filePath}`);
      filesModified++;
    }
  }
});

console.log(`\nFinished replacing spelling mistakes. Total files modified: ${filesModified}`);
