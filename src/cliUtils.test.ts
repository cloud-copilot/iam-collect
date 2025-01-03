import { describe, expect, it } from 'vitest'
import { parseCliArguments } from './cliUtils.js'

describe('parseCliArguments', () => {
  it('should return noParams: true when no arguments are passed', () => {
    //Given an empty array of arguments
    const args: string[] = []

    //When the arguments are parsed
    const result = parseCliArguments(args)

    //Then anyParams should be false
    expect(result.noParams).toEqual(true)
  })

  it('should return a command if the first argument is not a flag', () => {
    //Given an array of arguments with a command
    const args: string[] = ['init', '--regions', 'us-east-1']

    //When the arguments are parsed
    const result = parseCliArguments(args)

    //Then the command should be 'init'
    expect(result.cliArguments?.command).toEqual('init')
  })

  it('should not return a command if the first argument is a flag', () => {
    //Given an array of arguments with a command
    const args: string[] = ['--regions', 'us-east-1']

    //When the arguments are parsed
    const result = parseCliArguments(args)

    //Then the command should be undefined
    expect(result.cliArguments?.command).toEqual(undefined)
    expect(result.cliArguments?.regions).toEqual(['us-east-1'])
  })

  it('should return the regions if the --regions flag is present', () => {
    //Given an array of arguments with a command
    const args: string[] = ['init', '--regions', 'us-east-1']

    //When the arguments are parsed
    const result = parseCliArguments(args)

    //Then the regions should be ['us-east-1']
    expect(result.cliArguments?.regions).toEqual(['us-east-1'])
  })

  it('should return multiple regions if there are multiple --regions flags', () => {
    //Given an array of arguments with a command
    const args: string[] = ['init', '--regions', 'us-east-1', '--regions', 'us-west-1']

    //When the arguments are parsed
    const result = parseCliArguments(args)

    //Then the regions should be ['us-east-1', 'us-west-1']
    expect(result.cliArguments?.regions).toEqual(['us-east-1', 'us-west-1'])
  })

  it('should return multiple regions if there are multiple regions in a single --regions flag', () => {
    //Given an array of arguments with a command
    const args: string[] = ['init', '--regions', 'us-east-1', 'us-west-1']

    //When the arguments are parsed
    const result = parseCliArguments(args)

    //Then the regions should be ['us-east-1', 'us-west-1']
    expect(result.cliArguments?.regions).toEqual(['us-east-1', 'us-west-1'])
  })

  it('should return all regions from all --regions flags', () => {
    //Given an array of arguments with a command
    const args: string[] = [
      'init',
      '--regions',
      'us-east-1',
      'us-east-2',
      '--regions',
      'us-west-1',
      'us-west-2'
    ]

    //When the arguments are parsed
    const result = parseCliArguments(args)

    //Then the regions should be ['us-east-1', 'us-west-1', 'us-west-2']
    expect(result.cliArguments?.regions).toEqual([
      'us-east-1',
      'us-east-2',
      'us-west-1',
      'us-west-2'
    ])
  })

  it('should return unregonized params if an unknown flag is passed', () => {
    //Given an array of arguments with a command
    const args: string[] = ['init', '--unknown', 'us-east-1']

    //When the arguments are parsed
    const result = parseCliArguments(args)

    //Then the unrecognized params should be ['--unknown']
    expect(result.unrecognizedParams).toEqual(['--unknown'])
  })
})
