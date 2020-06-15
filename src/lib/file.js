import { mimeTypes } from '../config/config.json';
import logger from '../lib/logger';
import uuid from 'uuid/v4';
import { unlink } from 'fs';
import { createReadStream } from 'fs';
import { createModel } from 'mongoose-gridfs';

const isValid = ({ mime, mimeGroup = 'all' }) => {
  let mimes = [];
  if (mimeGroup === 'all')
    mimes = Object.keys(mimeTypes).reduce((all, m) => {
      return [...all, ...mimeTypes[m]];
    }, []);
  else mimes = mimeTypes[mimeGroup];
  return mimes.includes(mime);
};

const uploadToDisk = async ({ inputFiles, path, mimeGroup = 'all', indexes }) => {
  if (!inputFiles) return;
  let files = [];
  if (!Array.isArray(inputFiles)) {
    files[0] = inputFiles;
  } else files = inputFiles;

  return await Promise.all(
    await files.reduce(async (result, file, index) => {
      if (!file) return result;
      if (!isValid({ mime: file.mimetype, mimeGroup })) return result;
      let filename = `${uuid().replace(/-/g, '')}.${file.name.split('.').pop()}`;
      try {
        await file.mv(`${path}/${filename}`);
        result = await result;
        result.push({
          index: !!indexes ? indexes[index] : index,
          filename,
          mimetype: file.mimetype,
          encoding: file.encoding,
        });
        return result;
      } catch (e) {
        logger.error(e);
        unlink(`${path}/${filename}`);
        return result;
      }
    }, [])
  );
};

const uploadToGridFS = async ({ inputFiles, path, metaData }) => {
  let files = [];
  !Array.isArray(inputFiles) ? (files[0] = inputFiles) : (files = inputFiles);
  const File = createModel({
    modelName: 'File',
  });
  return await Promise.all(
    files.map(async (file, index) => {
      let readStream = createReadStream(`${path}/${file.filename}`);
      return await new Promise((resolve, reject) => {
        File.write(
          { filename: file.filename, contentType: file.mimetype, metadata: { ...metaData, index: file.index } },
          readStream,
          (error, f) => {
            error && reject(error);
            resolve({
              ...f.toJSON(),
              index: file.index,
            });
          }
        );
      });
    })
  );
};

const removeFromDisk = async ({ filenames, path }) => {
  let files = [];
  !Array.isArray(filenames) ? (files[0] = filenames) : (files = filenames);
  try {
    return await Promise.all(
      files.map((file) =>
        unlink(`${path}/${file}`, (e) => {
          e && logger.error(e);
        })
      )
    );
  } catch (e) {
    logger.error(e.message);
    return false;
  }
};

const removeFromGridFS = () => {};

export { isValid, uploadToDisk, removeFromDisk, uploadToGridFS };
