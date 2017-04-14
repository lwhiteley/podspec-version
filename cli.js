const PodspecBump = require("podspec-bump");
const PodspecBumper = PodspecBump.PodspecBumper;
const searcher = PodspecBump.podspecSearcher;
const shell = require("shelljs");
const semver = require("semver");
const includes = require("lodash.includes");
const fs = require('fs');
const pkg = require("./package.json");

const config = {
    prepend: `\n${pkg.name} (${pkg.version})\n\nUsage: podspec-version <increment> [options]`,
    append: '\n',
    options: [
        {
            option: 'help',
            alias: 'h',
            type: 'Boolean',
            description: 'displays help'
        },
        {
            option: 'increment',
            alias: 'i',
            type: 'String',
            description: 'Incrementing "major", "minor", or "patch" version; or specify version [default: "patch"]',
            example: 'podspec-bump -i minor'
        },
        {
            option: 'write',
            alias: 'w',
            type: 'Boolean',
            description: 'dry run is done by default, add --write to commit changes',
            example: 'podspec-bump --dump-version'
        }
    ]
};

if(process.env.NODE_ENV === 'test'){
    config.options.push({
            option: 'path',
            alias: 'p',
            type: 'String',
            description: 'path to podspec',
            example: 'podspec-bump --path /path/to/example.podspec'
        })
}

var optionator = require('optionator')(config);

var options = optionator.parse(process.argv);

if (options.help) {
    console.log(optionator.generateHelp());
} else {
    const version = options.increment || options._[0];
    const defaultVersionType = 'patch';
    const versionEnum = ['path', 'minor', 'major'];
    let versionType = 'patch';
    const shellOpts = {silent:true};
    if(includes(versionEnum, version)){
        versionType = version;
    }
    options.dryRun = !options.write;

    const stars = '************************************************';

    function runCommand(command, successMsg, failureMsg) {
        if (!options.dryRun) {
            const output = shell.exec(command, shellOpts);
            output.code !== 0 && shell.echo(`\n${failureMsg}`);
            output.code !== 0 && shell.echo(`\n${output.stderr}\n`);
            output.code == 0 && console.log(successMsg);
        } else {
            console.log(successMsg);
        }
    }

    function bump(podFilePath) {
        var bumper = new PodspecBumper(podFilePath);
        const currentVersion = bumper.getVersion();
       
        if(options.dryRun){
            console.log(`${stars}\nDry Run, changes will not be commited\n${stars}`)  
        }

        console.log(`\n${stars}\nSetup Information\n${stars}\n`) 
        console.log(`Current Version: ${currentVersion}`);
        console.log(`Version Bump Type: ${versionType.toUpperCase()}`);
        const newVersion = semver.inc(currentVersion, versionType);
        console.log(`New Version: ${newVersion}`);

        console.log(`\n${stars}\nCommence Modifications\n${stars}\n`) 

        !options.dryRun && fs.writeFileSync(podFilePath, bumper.bumpVersion(version));
        console.log(`Bumped podspec version to ${newVersion}`);


        const commitCmd = `git add . && git commit -am "release ${newVersion}"`
        runCommand(commitCmd, 
                    `Commited changes ==> ${commitCmd}`, 
                    'Error: Git commit failed');

        /**
         * Create tag
         */
        const createTagCmd = `git tag -a ${newVersion} -m "release ${newVersion}"`
        runCommand(createTagCmd, 
                    `Created tag ==> ${createTagCmd}`, 
                    'Error: Git tagging failed');


        /**
         * Push all changes and tag
         */
        const pushTagCmd = `git push --tags`
        const pushTagSuccessMsg = `Pushed all commits and tags ==> ${pushTagCmd}`
        runCommand(pushTagCmd, pushTagSuccessMsg, 'Error: Git push failed');

        console.log();
        
        if(options.dryRun){
            console.log(`${stars}\nDry Run Completed, no changes commited\n${stars}\n`)  
        }
    }

    if (options.path) {
        bump(options.path);
    } else {
        searcher.searchPodspecFilePath(process.cwd(), function (error, podFilePath) {
            if (error) {
                throw error;
            }
            bump(podFilePath)
        });
    }

}