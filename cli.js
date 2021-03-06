#!/usr/bin/env node

const PodspecBump = require("podspec-bump");
const PodspecBumper = PodspecBump.PodspecBumper;
const searcher = PodspecBump.podspecSearcher;
const shell = require("shelljs");
const semver = require("semver");
const includes = require("lodash.includes");
const fs = require('fs');
const pkg = require("./package.json");
var yesno = require('yesno');

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
            example: 'podspec-version -i patch'
        },
        {
            option: 'write',
            alias: 'w',
            type: 'Boolean',
            description: 'dry run is done by default, add --write to commit changes [default: false]',
            example: 'podspec-version --write'
        },
        {
            option: 'yes',
            alias: 'y',
            type: 'Boolean',
            description: 'answer yes to any possible questions [default: false]',
            example: 'podspec-version --yes'
        },
        {
            option: 'add',
            alias: 'a',
            type: 'Boolean',
            description: 'add untracked files before committing [default: false]',
            example: 'podspec-version --add'
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

    function runCommand(command, successMsg, failureMsg, progressMsg, print) {
        console.log(`\n${progressMsg || ''}`)
        if (!options.dryRun) {
            const output = shell.exec(command, shellOpts);
            output.code !== 0 && shell.echo(`${failureMsg}`);
            output.code !== 0 && shell.echo(`${output.stderr}`);
            output.code == 0 && print && shell.echo(`\n${output.stdout}`) && shell.echo(`${output.stderr}\n`) 
            output.code == 0 && console.log(successMsg);

        } else {
            console.log(successMsg);
        }
    }

    const runBump = (bumper, newVersion, podFilePath) => {
        console.log(`\n${stars}\nCommence Modifications\n${stars}\n`) 

        !options.dryRun && fs.writeFileSync(podFilePath, bumper.bumpVersion(version));
        console
        
        if(options.add){
            const addCmd = `git add .`
            runCommand(addCmd, 
                    `DONE: Add untracked and tracked changes completed`, 
                    'ERROR: Git add failed',
                    `Adding all changes ==> ${addCmd}`);
        }
        
        /**
         * Commit
         */
        const commitCmd = `git commit -am "chore: release ${newVersion}"`
        runCommand(commitCmd, 
                    `DONE: Commited changes`, 
                    'ERROR: Git commit failed',
                    `Committing all changes ==> ${commitCmd}`);

        /**
         * Create tag
         */
        const createTagCmd = `git tag -a ${newVersion} -m "tag: release ${newVersion}"`
        runCommand(createTagCmd, 
                    `DONE: Created tag `, 
                    'ERROR: Git tagging failed',
                    `Creating tag ==> ${createTagCmd}`);


        /**
         * Push all changes and tag
         */
        const pushTagCmd = `git push --follow-tags`;
        runCommand(pushTagCmd, 
                    `DONE: Pushed all commits and tags`, 
                    'ERROR: Git push failed',
                    `Pushing all commits and tags ==> ${pushTagCmd}`, 
                    true);

        console.log();
        
        if(options.dryRun){
            console.log(`${stars}\nDry Run Completed, no changes commited\n${stars}\n`)  
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

        if(!options.dryRun){
            console.log(`\n\nThis module currently does not update readme files. `);

            if(options.yes){
                return runBump(bumper, newVersion, podFilePath);
            }

            yesno.ask('\nAre you sure you made all changes before continuing? (YES|no)', true, function(ok) {
                if(ok) {
                    runBump(bumper, newVersion, podFilePath);
                    
                } else {
                    console.log("\n\nPlease make your updates and run the command again.\n");
                }
                return process.exit(0);
            }, ['yes', 'y', 'ok'], ['no', 'n']);
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