CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  avatar VARCHAR(500),
  headline VARCHAR(500),
  company VARCHAR(255),
  presence_status VARCHAR(20) DEFAULT 'offline',
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(255) PRIMARY KEY,
  last_message_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id VARCHAR(255) REFERENCES conversations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  unread_count INTEGER DEFAULT 0,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(255) PRIMARY KEY,
  conversation_id VARCHAR(255) REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  files JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(conversation_id, status);
CREATE INDEX IF NOT EXISTS idx_conversation_participants ON conversation_participants(user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO users (id, name, email, avatar, headline, company, presence_status) VALUES
  ('user1', 'Laeticia Friburg', 'laeticia.friburg@linkedin.com', 'imageToAdd', 'Senior Product Manager @ Tech Startup', 'InnovateCo', 'online'),
  ('user2', 'Oscar Gueneaud', 'oscar.gueneaud@linkedin.com', 'imageToAdd', 'Full Stack Developer | Open to opportunities', 'Freelance', 'away'),
  ('user3', 'Axel Nigen', 'axel.nigen@linkedin.com', 'imageToAdd', 'UX Designer | Building delightful experiences', 'DesignStudio', 'offline'),
  ('user4', 'Kylian Tonseca', 'kylian.tonseca@linkedin.com', 'imageToAdd', 'DevOps Engineer @ Fortune 500', 'MegaCorp', 'online'),
  ('user5', 'Steeve NoJobs', 'steeve.nojobs@linkedin.com', 'imageToAdd', 'Looking for opportunities', 'TalentHub', 'away')
ON CONFLICT (email) DO NOTHING;

INSERT INTO conversations (id) VALUES
  ('conv1'),
  ('conv2'),
  ('conv3')
ON CONFLICT (id) DO NOTHING;

INSERT INTO conversation_participants (conversation_id, user_id, unread_count) VALUES
  ('conv1', 'user1', 0),
  ('conv1', 'user2', 2),
  ('conv2', 'user1', 0),
  ('conv2', 'user3', 0),
  ('conv3', 'user1', 1),
  ('conv3', 'user4', 0)
ON CONFLICT (conversation_id, user_id) DO NOTHING;

INSERT INTO messages (id, conversation_id, sender_id, content, status, created_at) VALUES
  ('msg1', 'conv1', 'user2', 'Salut Laeticia ! J''ai vu ton post sur l''optimisation React. Super intéressant !', 'read', NOW() - INTERVAL '2 hours'),
  ('msg2', 'conv1', 'user1', 'Merci Oscar ! Content que ça t''ait aidé. Tu travailles sur quelque chose de similaire ?', 'read', NOW() - INTERVAL '1 hour'),
  ('msg3', 'conv1', 'user2', 'Oui, j''optimise notre plateforme e-commerce. Ce serait cool d''échanger !', 'sent', NOW() - INTERVAL '30 minutes'),
  ('msg4', 'conv2', 'user3', 'Hey Laeticia, question rapide sur le dernier mockup Figma', 'delivered', NOW() - INTERVAL '3 hours'),
  ('msg5', 'conv3', 'user1', 'Kylian, j''ai entendu dire que tu cherches à merger la branche Mi-monitoring128. J''ai peut-être quelqu''un de parfait pour ton équipe.', 'sent', NOW() - INTERVAL '45 minutes')
ON CONFLICT (id) DO NOTHING;

UPDATE conversations SET last_message_id = 'msg3' WHERE id = 'conv1';
UPDATE conversations SET last_message_id = 'msg4' WHERE id = 'conv2';
UPDATE conversations SET last_message_id = 'msg5' WHERE id = 'conv3';