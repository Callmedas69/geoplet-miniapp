const fs = require('fs');

// Read BaseScan ABI
const basescanContent = fs.readFileSync('abi/ABI_from_basescan.js', 'utf8');
const basescanABI = JSON.parse(basescanContent);

// Read Local ABI
const localContent = fs.readFileSync('abi/GeopletsABI.ts', 'utf8');
const localMatch = localContent.match(/export const GeopletsABI = (\[[\s\S]*?\]) as const;/);
const localABI = JSON.parse(localMatch[1]);

console.log('========================================');
console.log('ABI COMPARISON ANALYSIS');
console.log('========================================\n');

// Count items by type
const countByType = (abi) => {
  const counts = {};
  abi.forEach(item => {
    counts[item.type] = (counts[item.type] || 0) + 1;
  });
  return counts;
};

const basescanCounts = countByType(basescanABI);
const localCounts = countByType(localABI);

console.log('ITEM COUNTS:');
console.log('BaseScan ABI:', basescanCounts);
console.log('Local ABI:', localCounts);
console.log('');

// Find mintGeoplet function
const findMintGeoplet = (abi) => {
  return abi.find(item => item.type === 'function' && item.name === 'mintGeoplet');
};

const basescanMint = findMintGeoplet(basescanABI);
const localMint = findMintGeoplet(localABI);

console.log('========================================');
console.log('mintGeoplet FUNCTION COMPARISON');
console.log('========================================\n');

console.log('BaseScan mintGeoplet:');
console.log(JSON.stringify(basescanMint, null, 2));
console.log('\n');

console.log('Local mintGeoplet:');
console.log(JSON.stringify(localMint, null, 2));
console.log('\n');

// Deep comparison
const deepEqual = (obj1, obj2, path = '') => {
  const differences = [];
  
  if (typeof obj1 !== typeof obj2) {
    differences.push({ path, issue: 'Type mismatch', basescan: typeof obj1, local: typeof obj2 });
    return differences;
  }
  
  if (obj1 === null || obj2 === null) {
    if (obj1 !== obj2) {
      differences.push({ path, issue: 'Null mismatch', basescan: obj1, local: obj2 });
    }
    return differences;
  }
  
  if (typeof obj1 !== 'object') {
    if (obj1 !== obj2) {
      differences.push({ path, issue: 'Value mismatch', basescan: obj1, local: obj2 });
    }
    return differences;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  const allKeys = new Set([...keys1, ...keys2]);
  
  allKeys.forEach(key => {
    const newPath = path ? path + '.' + key : key;
    
    if (!(key in obj1)) {
      differences.push({ path: newPath, issue: 'Missing in BaseScan', basescan: undefined, local: obj2[key] });
    } else if (!(key in obj2)) {
      differences.push({ path: newPath, issue: 'Missing in Local', basescan: obj1[key], local: undefined });
    } else {
      differences.push(...deepEqual(obj1[key], obj2[key], newPath));
    }
  });
  
  return differences;
};

const mintDifferences = deepEqual(basescanMint, localMint, 'mintGeoplet');

if (mintDifferences.length === 0) {
  console.log('✅ mintGeoplet functions are IDENTICAL');
} else {
  console.log('❌ DIFFERENCES FOUND in mintGeoplet:');
  mintDifferences.forEach((diff, i) => {
    console.log('\nDifference #' + (i + 1) + ':');
    console.log('  Path:', diff.path);
    console.log('  Issue:', diff.issue);
    console.log('  BaseScan:', JSON.stringify(diff.basescan));
    console.log('  Local:', JSON.stringify(diff.local));
  });
}

console.log('\n========================================');
console.log('MintVoucher STRUCT COMPARISON');
console.log('========================================\n');

const basescanVoucher = basescanMint.inputs[0];
const localVoucher = localMint.inputs[0];

console.log('BaseScan MintVoucher:');
console.log(JSON.stringify(basescanVoucher, null, 2));
console.log('\n');

console.log('Local MintVoucher:');
console.log(JSON.stringify(localVoucher, null, 2));
console.log('\n');

const voucherDifferences = deepEqual(basescanVoucher, localVoucher, 'MintVoucher');

if (voucherDifferences.length === 0) {
  console.log('✅ MintVoucher structs are IDENTICAL');
} else {
  console.log('❌ DIFFERENCES FOUND in MintVoucher:');
  voucherDifferences.forEach((diff, i) => {
    console.log('\nDifference #' + (i + 1) + ':');
    console.log('  Path:', diff.path);
    console.log('  Issue:', diff.issue);
    console.log('  BaseScan:', JSON.stringify(diff.basescan));
    console.log('  Local:', JSON.stringify(diff.local));
  });
}

console.log('\n========================================');
console.log('FUNCTION LIST COMPARISON');
console.log('========================================\n');

const getFunctionNames = (abi) => {
  return abi.filter(item => item.type === 'function').map(item => item.name).sort();
};

const basescanFunctions = getFunctionNames(basescanABI);
const localFunctions = getFunctionNames(localABI);

console.log('BaseScan functions (' + basescanFunctions.length + '):', basescanFunctions);
console.log('\nLocal functions (' + localFunctions.length + '):', localFunctions);

const missingInLocal = basescanFunctions.filter(f => !localFunctions.includes(f));
const extraInLocal = localFunctions.filter(f => !basescanFunctions.includes(f));

if (missingInLocal.length > 0) {
  console.log('\n❌ Functions missing in Local ABI:', missingInLocal);
}

if (extraInLocal.length > 0) {
  console.log('\n❌ Extra functions in Local ABI:', extraInLocal);
}

if (missingInLocal.length === 0 && extraInLocal.length === 0) {
  console.log('\n✅ Function lists are IDENTICAL');
}

console.log('\n========================================');
console.log('COMPLETE ABI COMPARISON');
console.log('========================================\n');

const allDifferences = deepEqual(basescanABI, localABI, 'ABI');

if (allDifferences.length === 0) {
  console.log('✅ ABIs are COMPLETELY IDENTICAL');
} else {
  console.log('❌ Found ' + allDifferences.length + ' differences in total');
  console.log('\nShowing first 20 differences:');
  allDifferences.slice(0, 20).forEach((diff, i) => {
    console.log('\nDifference #' + (i + 1) + ':');
    console.log('  Path:', diff.path);
    console.log('  Issue:', diff.issue);
    console.log('  BaseScan:', JSON.stringify(diff.basescan).substring(0, 100));
    console.log('  Local:', JSON.stringify(diff.local).substring(0, 100));
  });
  
  if (allDifferences.length > 20) {
    console.log('\n... and ' + (allDifferences.length - 20) + ' more differences');
  }
}
