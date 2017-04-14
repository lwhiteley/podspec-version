# podspec-version
automatically bump podspec version, create tag and push tag

### Install

`npm i -g podspec-version`



### How to use

> Note: Only run the command within the root of the iOS project

`podspec-version -h`

```
Usage: podspec-version <increment> [options]

  -h, --help              displays help
  -i, --increment String  Incrementing "major", "minor", or "patch" version; or specify version [default: "patch"]
  -w, --write             dry run is done by default, add --write to commit changes [default: false]
  -a, --add               add untracked files before committing [default: false]
```

### Do a dry run to see what would happen

`podspec-version ` or `podspec-version patch`

### Commit changes

when you are comfortable just add `-w` to commit changes, tag release and push changes

For eg: We start with version `0.0.1`

Patch Release: `podspec-version -w` => `0.0.2`

Minor Release: `podspec-version -w minor` => `0.1.0`

Major Release: `podspec-version -w major` => `1.0.0`
