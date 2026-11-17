var CLIeasy = require('cli-easy'),
      assert = require('assert');

  CLIeasy.describe('bunyip')
    .use('bunyip')
    .discuss('when using bunyip')
    .undiscuss()

    // Single arguments
    .discuss('calling with -h')
      .arg('-h')
      .expect('should return help message', /Usage\: bunyip/)
    .undiscuss()

    .discuss('calling with -V')
      .arg('-V')
      .expect('should return help message', /\d\.\d\.\d/)
    .undiscuss()

    .discuss('calling with -f')
      .arg('-f')
      .expect('should return error message that it\'s missing a file', null, /error\: option/)
    .undiscuss()

    .discuss('calling with -x')
      .arg('-x')
      .expect('should return unknown option error', null, /error\: unknown option \`\-x\'/)
    .undiscuss()
    .export(module);