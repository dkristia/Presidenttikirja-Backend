import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import cors from 'cors'; // Import the cors middleware
import { Request, Response } from 'express';
import colorize from './colorize';

const app = express();
const port = 1369; // Choose a port for your server
const K = 20;

app.use(bodyParser.json());

app.use(cors());

app.set('trust proxy', true)

const color = colorize;

interface Data {
    [question: string]: Array<[string, string]>;
}

const data: Data = {};

app.post('/receive-data', (req: Request, res: Response) => {
    const { winner, loser, question } = req.body;
    const allowednames = JSON.parse(fs.readFileSync('src/data/allowed-names.json').toString());
    const allowedquestions = JSON.parse(fs.readFileSync('src/data/allowed-questions.json').toString());
	if (!(allowednames.includes(winner) && allowedquestions.includes(question)) && question !== "get-elo-only") {
		res.send({elo: {"Invalid": {"User sent invalid name/question": 1000}}});
		console.log(`${req.ip} tried to send invalid question or name: ${question}, ${winner}`);
        return
	}
    const elopath = 'src/data/elo.json';
    const elodataBuffer = fs.readFileSync(elopath);
    const elodata = JSON.parse(elodataBuffer.toString());
    if (question === 'get-elo-only') {
        res.send({ elo: elodata });
        return;
    }
    let dateTime = new Date();
    console.log(
        "\nReceived data at " +
        color.yellow(dateTime) +
        color.white(":\nWinner: ") +
        color.green(winner) +
        color.white(", Loser: ") +
        color.red(loser) +
        color.white(', Question: "') +
        question +
        '"'
    );
    const elo = elodata[question];
    const averages = elodata['Averages'];
    if (elo[winner] === undefined) {
        elo[winner] = 500;
    }
    if (elo[loser] === undefined) {
        elo[loser] = 500;
    }
    const winnerElo = elo[winner];
    const loserElo = elo[loser];
    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
    const newWinnerElo = winnerElo + K * (1 - expectedWinner);
    const newLoserElo = loserElo + K * (0 - expectedLoser);
    elodata[question][winner] = newWinnerElo;
    elodata[question][loser] = newLoserElo;

    let winnercombined = 0
    let losercombined = 0

    for (const otherquestion of Object.keys(elodata)) {
        if (otherquestion === 'Averages' || otherquestion === question) {
            continue;
        }
        winnercombined += elodata[otherquestion][winner];
        losercombined += elodata[otherquestion][loser];
    }
    averages[winner] = (newWinnerElo + winnercombined) / (Object.keys(elodata).length - 1)
    averages[loser] = (newLoserElo + losercombined) / (Object.keys(elodata).length - 1)
    elodata['Averages'][winner] = averages[winner]
    elodata['Averages'][loser] = averages[loser]

    console.log(newWinnerElo, newLoserElo)
    if (!(winnerElo === undefined || loserElo === undefined)) {
        const eloArray: [string, number][] = Object.entries(elo);

        eloArray.sort((a, b) => b[1] - a[1]);

        const sortedElo = Object.fromEntries(eloArray);
        elodata[question] = sortedElo;
        fs.writeFileSync(elopath, JSON.stringify(elodata, null, 2), 'utf-8');
    }

    saveDataToFile({ winner, loser, question });

    res.send({ elo: elodata });

});

function saveDataToFile(data: { winner: string; loser: string; question: string }) {
    const filePath = 'src/data/newdata.json';

    let existingData: Data = {};
    try {
        const dataBuffer = fs.readFileSync(filePath);
        existingData = JSON.parse(dataBuffer.toString());
    } catch (error) {
        console.log('No existing data found (???)');
    }

    if (!existingData[data.question]) {
        existingData[data.question] = [];
    }
    existingData[data.question].push([data.winner, data.loser]);

    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf-8');
}

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
