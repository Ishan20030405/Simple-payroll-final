const db = require('../config/db');

function imageType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.toString('ascii', 12, 16) === 'IHDR') return 'image/png';
  if (buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
  if (buffer.length >= 16 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
exports.imageType = imageType;
exports.getEmployeePicture = async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT p.image_data, p.mime_type FROM employees e INNER JOIN user_profile_pictures p ON p.user_id = e.user_id WHERE e.id = ?', [req.params.id]);
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    if (!rows[0]) return res.status(404).json({ message: 'No profile picture available.' });
    return res.type(rows[0].mime_type).send(rows[0].image_data);
  } catch (error) { next(error); }
};
exports.get = async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT image_data, mime_type FROM user_profile_pictures WHERE user_id = ?', [req.user.id]);
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    if (!rows[0]) return res.status(404).json({ message: 'No profile picture uploaded.' });
    return res.type(rows[0].mime_type).send(rows[0].image_data);
  } catch (error) { next(error); }
};
exports.upload = async (req, res) => {
  const mime = imageType(req.file?.buffer);
  if (!mime) return res.status(400).json({ message: 'Choose a JPG, PNG, or WebP image.' });
  await db.execute('INSERT INTO user_profile_pictures (user_id, image_data, mime_type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE image_data = VALUES(image_data), mime_type = VALUES(mime_type)', [req.user.id, req.file.buffer, mime]);
  return res.json({ message: 'Profile picture saved.' });
};
exports.remove = async (req, res) => {
  await db.execute('DELETE FROM user_profile_pictures WHERE user_id = ?', [req.user.id]);
  return res.json({ message: 'Profile picture removed.' });
};
