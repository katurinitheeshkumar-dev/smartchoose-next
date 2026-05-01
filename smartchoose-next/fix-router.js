const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Replace Link imports
    if (content.includes("from 'react-router-dom'") || content.includes('from "react-router-dom"')) {
        let importsToKeep = [];
        let nextNavigationImports = [];
        let nextLinkImports = [];
        
        if (content.includes('useNavigate')) { nextNavigationImports.push('useRouter'); }
        if (content.includes('useLocation')) { nextNavigationImports.push('usePathname'); }
        if (content.includes('useParams') || content.includes('useSearchParams')) {
             if(content.includes('useParams')) nextNavigationImports.push('useParams');
             if(content.includes('useSearchParams')) nextNavigationImports.push('useSearchParams');
        }
        if (content.includes('Link')) { nextLinkImports.push('Link'); }
        
        let newImports = '';
        if (nextNavigationImports.length > 0) {
            newImports += `import { ${nextNavigationImports.join(', ')} } from 'next/navigation';\n`;
        }
        if (nextLinkImports.length > 0) {
            newImports += `import Link from 'next/link';\n`;
        }
        
        // Remove react-router-dom import (crudely)
        content = content.replace(/import\s+{[^}]+}\s+from\s+['"]react-router-dom['"];?\n?/g, newImports);
        changed = true;
    }

    if (content.includes('useNavigate()')) {
        content = content.replace(/useNavigate\(\)/g, 'useRouter()');
        content = content.replace(/navigate\(/g, 'router.push(');
        content = content.replace(/const navigate =/g, 'const router =');
        changed = true;
    }

    if (content.includes('useLocation()')) {
        content = content.replace(/useLocation\(\)/g, 'usePathname()');
        content = content.replace(/location\.pathname/g, 'pathname');
        content = content.replace(/const location =/g, 'const pathname =');
        changed = true;
    }

    if (content.includes('<Link to=')) {
        content = content.replace(/<Link\s+to=/g, '<Link href=');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed', filePath);
    }
}

function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            walk(filePath);
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            processFile(filePath);
        }
    });
}

walk(srcDir);
