import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  try {
    return res.status(200).json(`Api version 1.`);
  } catch (error) {
    return res.status(500).json(error);
  }
});

module.exports = router;
