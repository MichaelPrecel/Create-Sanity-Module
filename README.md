# Create-Sanity-Module
A little Node script to generate a new Sanity module file, insert it into the schema index, add it to your builder array. You're welcome!

This script makes some assumptions:
- Your schemas live in the root of your project in a folder called "schemas"
- The index.ts file for your schemas is found at `schemas/index.ts`
- Your module schemas are found at `schemas/modules/`
- You have VS Code's CLI installed (to open the file after creating it)

*Example*
`node createBuilderModule.js whatever-you-like`
