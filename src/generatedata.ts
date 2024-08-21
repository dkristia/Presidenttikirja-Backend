import fs from 'fs';


const giveElo = (question: string) => {
    const K = 20;
    const filePath = 'src/data/newdata.json';
    const dataBuffer = fs.readFileSync(filePath);
    const existingData = JSON.parse(dataBuffer.toString());
    const questionData = existingData[question];
    const elo: { [key: string]: number } = {};
    for (const [winner, loser] of questionData) {
        if (!elo[winner]) {
            elo[winner] = 500;
        }
        if (!elo[loser]) {
            elo[loser] = 500;
        }
        const winnerElo = elo[winner];
        const loserElo = elo[loser];
        const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
        const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
        const newWinnerElo = winnerElo + K * (1 - expectedWinner);
        const newLoserElo = loserElo + K * (0 - expectedLoser);
        elo[winner] = newWinnerElo;
        elo[loser] = newLoserElo;
    }
    return elo;
}

const filePath = 'src/data/newdata.json';
const dataBuffer = fs.readFileSync(filePath);
const edata = JSON.parse(dataBuffer.toString());

const questions = Object.keys(edata);

for (const question of questions) {
    const elo = giveElo(question);
    const filePath = `src/data/elo.json`;
    const dataBuffer = fs.readFileSync(filePath);
    let existingData;
    if (dataBuffer.length === 0) {
        existingData = {};
    } else {
        existingData = JSON.parse(dataBuffer.toString());
    }

    const eloArray = Object.entries(elo);

    eloArray.sort((a, b) => b[1] - a[1]);

    const sortedElo = Object.fromEntries(eloArray);

    existingData[question] = sortedElo;
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf-8');
}

const averages: { [key: string]: number } = {};
const counts: { [key: string]: number } = {};
for (const question of questions) {
    const elo = giveElo(question);
    for (const [person, value] of Object.entries(elo)) {
        if (!averages[person]) {
            averages[person] = value;
            counts[person] = 1;
        } else {
            averages[person] += value;
            counts[person] += 1;
        }
    }
}

for (const [person, value] of Object.entries(averages)) {
    averages[person] = value / counts[person];
}

const filePath2 = `src/data/elo.json`;
const dataBuffer2 = fs.readFileSync(filePath2);
const existingData = JSON.parse(dataBuffer2.toString());

const eloArray = Object.entries(averages);

eloArray.sort((a, b) => b[1] - a[1]);

const sortedElo = Object.fromEntries(eloArray);


existingData['Averages'] = sortedElo;
fs.writeFileSync(filePath2, JSON.stringify(existingData, null, 2), 'utf-8');