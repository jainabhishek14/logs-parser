// eslint-disable-next-line no-undef
const path = require("path");
// eslint-disable-next-line no-undef
const fs = require("fs");
// eslint-disable-next-line no-undef
const readline = require("readline");

const rl = readline.createInterface({
	// eslint-disable-next-line no-undef
	input: process.stdin,
	// eslint-disable-next-line no-undef
	output: process.stdout
});

// eslint-disable-next-line no-undef
const logDirectory = path.join(__dirname, "logs");

const activities = [
	{
		type: "numDisconnects",
		pattern: /Client is disconnected from agent*/,
		title: "Number of Disconnects"
	},
	{
		type: "numLimitExceed", 
		pattern: /Average limit (300)*/,
		title: "Number of Average Limit exceed"
	},
	{
		type: "numDrops",
		pattern: /Drop count limit*/,
		title: "Number of Drops"
	}
];

class logObject {
	constructor() {
		this.numLimitExceed = new Object();
		this.numDrops = new Object();
		this.numDisconnects = new Object();
	}
}

const getComputerName = text => text.split(" ")[1].split(":")[1];

const getDate = (text, defaultYear) => {
	text = text.split(" ")[0].replace(/\(/,"").split("/");
	return new Date(defaultYear, text[0], text[1]);
};

const updateValue = (previousItem, computerName, counter) => {
	const newvalue = {
		...previousItem,
		[computerName] : (previousItem && previousItem.hasOwnProperty(computerName)) ? previousItem[computerName] + counter : 1
	};
	return newvalue;
};

const parseLogs = (item, type, computerName, date, startDate, endDate) => {
	return (date >= startDate && date <= endDate) ? {
		...item,
		[type]: updateValue(item[type], computerName, 1)
	} : item;
};

const parseLogsRows = (item, row, defaultDate, startDate, endDate) => {
	const parts = row.split("|");
	const computerName = getComputerName(parts[0].trim());
	const date = getDate(parts[1].trim(), defaultDate.substring(0, 4));
	const type = activities.find(activity => parts[2].trim().search(activity.pattern) !== -1);

	return type ? parseLogs(item, type.type, computerName, date, startDate, endDate) : item;
};

const processLogs = (item, data, fileName, startDate, endDate) => data.split("\r\n").reduce(
	(acc, row) => row ? parseLogsRows(acc, row, fileName, startDate, endDate) : acc, 
	item);


const checkExistence = (directory, callback) => fs.stat(directory, (err, stats) => {
	if(err){
		callback(err);
	}
	callback(null, stats);
});

const readFile = (item, directory, fileName, startDate, endDate) => 
	processLogs(
		item, 
		fs.readFileSync(path.join(directory, fileName), "utf8"), 
		fileName.replace(".log", ""),
		startDate,
		endDate
	);

const sortDescending = content =>
	Object.entries(content)
		.sort((a, b) => b[1] - a[1]);

const showReports = (report, fromDate, toDate) => {
	console.log(`Date: ${fromDate.toString()} to ${toDate.toString()}`);
	Object.keys(report).forEach(key => {
		console.log(`Computer Name: ${activities.find(activity => activity.type === key).title}`);
		sortDescending(report[key]).forEach(item => console.log(`${item[0]}: ${item[1]}`));
	});
};
 
const readLogs = (logDirectory, startDate, endDate) => checkExistence(logDirectory, err => {
	if(err){
		return console.error(err);
	}
	fs.readdir(logDirectory, async (err, files) => {
		if(err){
			return console.log(err); 
		}
		await showReports(files.reduce(
			(acc, file)  => readFile(acc, logDirectory, file, startDate, endDate), 
			new logObject()
		), startDate, endDate);
	});
});

const validateDates = (start, end) => {
	const pattern = /([0-3]{1}[0-9]{1}\s{1}[A-Z]{3}\s{1}[0-9]{4})/i;
	return start.match(pattern) && end.match(pattern) && !isNaN(Date.parse(start)) && !isNaN(Date.parse(end)) || false;
};

const processStart = () => {
	rl.question("Report Start Date (Ex: 01 Jan 2012): ", startDate => {
		rl.question("Report End Date (Ex: 01 Jan 2012): ", endDate => {
			if(validateDates(startDate, endDate)){
				readLogs(logDirectory, new Date(startDate), new Date(endDate));
			} else{
				console.log("Dates entered are invalid. Please enter in (01 Jan 2012) format.");
			}
			rl.close();
		});
	});
};

processStart();

