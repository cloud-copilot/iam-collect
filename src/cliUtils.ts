const allowedArguments = new Set(['regions', 'services', 'accounts'])

interface CliArguments {
  command: string | undefined
  regions?: string[]
  services?: string[]
}

interface ParsedCliArguments {
  unrecognizedParams?: string[]
  noParams?: boolean
  cliArguments?: CliArguments
}

export function parseCliArguments(args: string[]): ParsedCliArguments {
  if (args.length == 0) {
    return {
      noParams: true
    }
  }

  const firstArg = args[0]
  let command = undefined
  let unrecognizedParams: string[] = []
  if (!firstArg.startsWith('--')) {
    command = firstArg
    args = args.slice(1)
  }

  const cliArguments: CliArguments = {
    command: command
  }

  let currentArgType: 'regions' | 'services' | undefined

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      currentArgType = arg.slice(2) as 'regions' | 'services'
      if (!allowedArguments.has(currentArgType)) {
        unrecognizedParams.push(arg)
        currentArgType = undefined
      }
    } else {
      if (currentArgType) {
        cliArguments[currentArgType] = cliArguments[currentArgType] || []
        cliArguments[currentArgType]!.push(arg)
      }
    }
  }

  return {
    cliArguments,
    unrecognizedParams: unrecognizedParams.length > 0 ? unrecognizedParams : undefined
  }
}
