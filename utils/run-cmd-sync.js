import { execSync } from 'child_process'

export const cmdSync = async (cmd) => {
   let response = { err: false, data: '' }
   const cleaner = (arr) => arr.filter((e) => e.length > 0)
   try {
      let options = { stdio : 'pipe' }
      let stdout = execSync(cmd , options)
      response.data = cleaner(stdout.toString().split('\n'))
      return response
   } catch (e) {
      response.err = true
      response.data = cleaner(e.stderr.toString().split('\n'))
      return response
   }
}
