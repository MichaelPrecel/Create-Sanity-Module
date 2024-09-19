const fs = require('fs').promises
const path = require('path')
const {exec} = require('child_process')

function camelToTitleCase(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

async function createSanityModule(moduleName) {
  const schemasDir = path.join('.', 'schemas')
  const modulesDir = path.join(schemasDir, 'modules')
  const indexPath = path.join(schemasDir, 'index.ts')
  const builderPath = path.join(schemasDir, 'objects', 'builder.ts')

  // 1. Create the new module file
  const newModulePath = path.join(modulesDir, `${moduleName}.ts`)
  await fs.writeFile(
    newModulePath,
    `
import {defineField} from 'sanity'

export default defineField({
  name: 'module.${moduleName}',
  title: '${camelToTitleCase(moduleName)}',
  icon: () => '❓',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
  ],
})
  `.trim(),
  )

  // 2. Update the index.ts file
  let indexContent = await fs.readFile(indexPath, 'utf8')
  const importLine = `import modules${moduleName} from './modules/${moduleName}'`

  // Check if the import already exists
  if (!indexContent.includes(importLine)) {
    // Find the last import in the Modules section
    const moduleImportRegex = /^import modules\w+ from '\.\/modules\/\w+'/gm
    let lastMatch
    let match
    while ((match = moduleImportRegex.exec(indexContent)) !== null) {
      lastMatch = match
    }

    if (lastMatch) {
      // Insert the new import after the last existing module import
      indexContent =
        indexContent.slice(0, lastMatch.index + lastMatch[0].length) +
        '\n' +
        importLine +
        indexContent.slice(lastMatch.index + lastMatch[0].length)
    } else {
      // If no existing module imports, add it at the start of the Modules section
      indexContent = indexContent.replace(
        /\/\/ Modules\n\/\/ ---------------\n/,
        `$&${importLine}\n`,
      )
    }
  }

  // Add the new module to the modules array if it's not already there
  const moduleArrayRegex = /const modules = \[([\s\S]*?)\]/
  const moduleArrayMatch = indexContent.match(moduleArrayRegex)

  if (moduleArrayMatch && !moduleArrayMatch[1].includes(`modules${moduleName}`)) {
    const moduleArray = moduleArrayMatch[1].trim()
    let updatedModuleArray

    if (moduleArray.includes('\n')) {
      // Multi-line array
      const lastModuleMatch = moduleArray.match(/(\s+)(\w+),?\s*$/)
      if (lastModuleMatch) {
        const [, indent, lastModule] = lastModuleMatch
        updatedModuleArray = moduleArray.replace(
          new RegExp(`${lastModule},?\\s*$`),
          `${lastModule},\n${indent}modules${moduleName},`,
        )
      } else {
        // Fallback if we can't match the last module
        updatedModuleArray = `${moduleArray},\n  modules${moduleName},`
      }
    } else {
      // Single-line array
      updatedModuleArray = moduleArray.endsWith(',')
        ? `${moduleArray} modules${moduleName},`
        : `${moduleArray}, modules${moduleName}`
    }

    indexContent = indexContent.replace(moduleArrayRegex, `const modules = [${updatedModuleArray}]`)
  }

  await fs.writeFile(indexPath, indexContent)

  // 3. Update the builder.ts file
  let builderContent = await fs.readFile(builderPath, 'utf8')
  const newModuleLine = `    {type: 'module.${moduleName}'},`

  if (!builderContent.includes(newModuleLine)) {
    builderContent = builderContent.replace(
      /(\s+)(\{type: '[^']+'\},)\n(\s+)\]/,
      `$1$2\n$1${newModuleLine}\n$3]`,
    )
    await fs.writeFile(builderPath, builderContent)
  }

  console.log(`[Module '${moduleName}' has been created and integrated successfully.]`)

  // Open the new file in VS Code
  exec(`code -r ${newModulePath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Error opening file in VS Code: ${error}]`)
      return
    }
    console.log(`[Opened ${newModulePath} in VS Code.]`)
  })
}

// Usage
const moduleName = process.argv[2]
if (!moduleName) {
  console.error('[Please provide a module name as an argument.]')
  process.exit(1)
}

createSanityModule(moduleName).catch((error) => console.error('Error:', error))
