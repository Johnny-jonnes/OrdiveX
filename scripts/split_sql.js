const fs = require('fs');

function splitSqlFile(filePath, prefix, table, maxInserts) {
    if (!fs.existsSync(filePath)) {
        console.log("File not found: " + filePath);
        return;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Find the VALUES keyword
    const valuesIndex = content.indexOf('VALUES');
    if (valuesIndex === -1) return;
    
    const header = content.substring(0, valuesIndex + 6) + '\n';
    let dataPart = content.substring(valuesIndex + 6).trim();
    if(dataPart.startsWith('(') && dataPart.startsWith('\n')) {
        // clean up
    }
    
    // Remove the trailing semicolon if it exists
    if (dataPart.endsWith(';')) {
        dataPart = dataPart.substring(0, dataPart.length - 1);
    }

    // Split by "),\n(" or "),(" or just "), "
    // A robust way to split is to use regex matching ending tuples.
    // Let's just split by '),'
    const rows = dataPart.split('),');
    
    let currentRows = [];
    let fileCount = 1;

    for (let i = 0; i < rows.length; i++) {
        let row = rows[i].trim();
        if (row.startsWith('(')) row = row.substring(1);
        if (row.endsWith(';')) row = row.substring(0, row.length - 1);
        
        currentRows.push('(' + row + ')');

        if (currentRows.length >= maxInserts || i === rows.length - 1) {
            const outPath = `scripts/${prefix}_part_${fileCount}.sql`;
            let outContent = header + currentRows.join(',\n') + ';\n';
            fs.writeFileSync(outPath, outContent);
            console.log(`Created ${outPath} with ${currentRows.length} rows.`);
            
            currentRows = [];
            fileCount++;
        }
    }
}

splitSqlFile('seed_50k.sql', 'seed_50k', 'products', 2500); // 2500 rows per chunk
splitSqlFile('seed_20k_extra.sql', 'seed_20k', 'various', 2500);
