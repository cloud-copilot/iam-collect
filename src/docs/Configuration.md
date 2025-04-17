# Configuring iam-collect

## Configuration Files

iam-collect is configured using a JSON file. JSONC is supported so you can include comments.

## Creating a Configuration File

To create a default configuration file, run:

```bash
iam-collect init
```

This will create a file called `iam-collect.jsonc` in the current directory with a simple default configuration and many comments on how to customize the configuration.

## Default Configuration File

The default configuration file is `iam-collect.jsonc` in the current directory you are running in. iam-collect will look for this file by default, and if it is present, you do not need to specify a config.

## Specifying Configuration Files

You can use the `--config-files` option to specify a configuration file or multiple configuration files. The files will be merged together, with the last file taking precedence in case of conflicts.
