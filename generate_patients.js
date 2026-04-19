const fs = require('fs');

const firstNamesM = ['Mamadou', 'Alpha', 'Oumar', 'Amadou', 'Ibrahima', 'Abdoulaye', 'Ousmane', 'Aliou', 'Boubacar', 'Hassan', 'Sekou', 'Fode'];
const firstNamesF = ['Fatoumata', 'Aissatou', 'Mariam', 'Aminata', 'Kadiatou', 'Binta', 'Zeynab', 'Hawa', 'Djenabou', 'Mariama'];
const lastNames = ['Diallo', 'Bah', 'Barry', 'Sow', 'Sylla', 'Camara', 'Keita', 'Toure', 'Traore', 'Kourouma', 'Conde'];
const cities = ['Kaloum', 'Ratoma', 'Matoto', 'Dixinn', 'Matam', 'Coyah', 'Dubréka', 'Kindia'];
const allergiesList = ['', '', '', '', 'Pénicilline', 'Aspirine', 'Arachide', 'Lactose', 'Ibuprofène', 'Latex'];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
    return arr[getRandomInt(0, arr.length - 1)];
}

function generatePhone() {
    const prefixes = ['620', '621', '622', '623', '624', '625', '627', '628', '629', '660', '661', '662'];
    return prefixes[getRandomInt(0, prefixes.length - 1)] + String(getRandomInt(100000, 999999));
}

function generateDOB() {
    const start = new Date(1940, 0, 1).getTime();
    const end = new Date(2015, 0, 1).getTime();
    const randomDate = new Date(start + Math.random() * (end - start));
    return randomDate.toISOString().split('T')[0];
}

const TOTAL_PATIENTS = 20000;
const csvFile = 'Patients_20000_PharmaProjet.csv';

const header = '\uFEFFNom,Téléphone,Adresse,Sexe,Allergies,Email,Date de naissance\n';
fs.writeFileSync(csvFile, header, 'utf8');

let phoneSet = new Set();
let count = 0;

for (let i = 0; i < TOTAL_PATIENTS; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale ? getRandomItem(firstNamesM) : getRandomItem(firstNamesF);
    const lastName = getRandomItem(lastNames);
    const fullName = `${firstName} ${lastName}`;
    
    let phone;
    do {
        phone = generatePhone();
    } while (phoneSet.has(phone));
    phoneSet.add(phone);
    
    const address = `Conakry ${getRandomItem(cities)}`;
    const sex = isMale ? 'M' : 'F';
    const allergies = getRandomItem(allergiesList);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${getRandomInt(1, 999)}@email.com`;
    const dob = generateDOB();
    
    const row = [fullName, phone, address, sex, allergies, email, dob].join(',') + '\n';
    fs.appendFileSync(csvFile, row, 'utf8');
    
    count++;
    if (count % 2000 === 0) {
        console.log(`Générés: ${count} patients...`);
    }
}

console.log(`\nFichier ${csvFile} généré avec succès avec ${TOTAL_PATIENTS} patients !`);
