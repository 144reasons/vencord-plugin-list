/* eslint-disable no-inline-comments */
const fs = require('fs');
const config = require('../config.json');
const request = require('request');
// eslint-disable-next-line no-unused-vars
const exec = require('child_process').exec;

async function getZip(owner, repo, path, token) {
	return await request({ method: 'GET', uri: `https://api.github.com/repos/${owner}/${repo}/zipball/`, headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token}`, 'User-Agent': 'Awesome-Octocat-App' }, encoding: null }).pipe(fs.createWriteStream('./tmp/test.zip'));
}

(async () => {
	await getZip('Vendicated', 'Vencord', 'src/plugins', config.githubToken);

	setTimeout(async function() {
		exec('7z x ./tmp/test.zip -o./tmp -y',
			async function(error, stdout, stderr) {
				console.log('stdout: ' + stdout);
				console.log('stderr: ' + stderr);
				if (error !== null) {
					console.log('exec error: ' + error);
				}

				const repoFolder = fs.readdirSync('./tmp').filter(file => file.startsWith('Vendicated-'));

				const constantsFile = (await fs.readFileSync(`./tmp/${repoFolder}/src/utils/constants.ts`)).toString();

				let Devs = (constantsFile.match(/(?<=Object.freeze\(\{).*?(?=}\);)/s))[0];

				// eslint-disable-next-line no-unused-vars
				Devs = eval('({' + Devs + '})');

				const pluginsFolder = fs.readdirSync(`./tmp/${repoFolder}/src/plugins`);

				const plugins = [];

				console.log('Plugin names: ');

				await pluginsFolder.forEach(async function(value, index) {
					let fileContent;

					if (!value.endsWith('.ts') && !value.endsWith('.tsx')) {
						if (fs.existsSync(`./tmp/${repoFolder}/src/plugins/${value}/index.ts`)) {
							fileContent = (await fs.readFileSync(`./tmp/${repoFolder}/src/plugins/${value}/index.ts`)).toString();
						}
						else if (fs.existsSync(`./tmp/${repoFolder}/src/plugins/${value}/index.tsx`)) {
							fileContent = (await fs.readFileSync(`./tmp/${repoFolder}/src/plugins/${value}/index.tsx`)).toString();
						}
						else {return;}
					}
					else {fileContent = (await fs.readFileSync(`./tmp/${repoFolder}/src/plugins/${value}`)).toString();}

					if (!fileContent) return;

					if (value === 'index.ts') return;

					let pluginName = fileContent.match(/(?<=\({\s{1,8}name: ").*?(?=")/);
					let pluginDescription = fileContent.match(/((?<=\s{1,8}description:.*?').*?(?='))|((?<=\s{1,8}description:.*?").*?(?="))/s);
					let pluginAuthors = (fileContent.match(/(?<=\s{1,8}authors: \[).*?(?=\])/s));

					if (pluginDescription) pluginDescription = pluginDescription[0];
					if (pluginName) pluginName = pluginName[0];
					if (pluginAuthors) pluginAuthors = pluginAuthors[0].replace(/\s/g, '');

					pluginAuthors = eval('[' + pluginAuthors + ']');

					plugins.push({ pluginIndex: index, pluginName: pluginName || null, pluginDescription: pluginDescription || null, pluginAuthors: pluginAuthors || null });
				});

				let template = fs.readFileSync('./template/template.md');

				await plugins.forEach(async function(value) {
					let authors = [];

					await value.pluginAuthors.forEach(function(_authorObj) {
						authors.push(`[${_authorObj.name}](https://discord.com/users/${((_authorObj.id).toString())})`);
					});

					authors = authors.join(', ');

					template = template + `\n\n## ${value.pluginName}\n#### ${authors}\n${value.pluginDescription}`;
				});

				// console.log(template);

				fs.writeFileSync('./finished/finished.md', template);

				fs.rmSync(`tmp/${repoFolder}`, { recursive: true, force: true });

				fs.rmSync('tmp/test.zip', { recursive: true, force: true });

			});
	}, 1000);
})();