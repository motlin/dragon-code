-- Invented levels and scores the Worker and browser tests load on top of the migrations. The owners are the SHA-256 of
-- the player ids alice-player-0001 and bob-player-000002.
INSERT INTO levels (id, owner, nick, name, data, created_at) VALUES
	('alice-bridge', '24418d0c92e920430c0ffd5967057973ca531343d5d6c9b8d0ff46e410ab4db9', 'Alice', 'The Bridge', '{"w":5,"h":3,"map":[".....",".~~~.","....."],"dragon":{"x":0,"y":1,"d":1},"knights":[{"type":"soldier","x":4,"y":1,"d":3,"prog":"W"}]}', 1794196000000),
	('bob-gauntlet', '4308e6db92cc0df9d17066973c6440327ddd5a6b348d73193a1a1a841d1c68af', 'Bob', 'Gauntlet', '{"w":4,"h":3,"map":["....","....","...."],"dragon":{"x":0,"y":0,"d":1},"knights":[{"type":"shield","x":3,"y":0,"d":3,"prog":"FU"}]}', 1794197000000);
INSERT INTO scores (owner, nick, best, updated_at) VALUES
	('24418d0c92e920430c0ffd5967057973ca531343d5d6c9b8d0ff46e410ab4db9', 'Alice', 7, 1794196100000),
	('4308e6db92cc0df9d17066973c6440327ddd5a6b348d73193a1a1a841d1c68af', 'Bob', 4, 1794196200000);
