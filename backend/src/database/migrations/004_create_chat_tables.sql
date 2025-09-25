CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    conv_a UUID GENERATED ALWAYS AS (LEAST(user_a_id, user_b_id)) STORED,
    conv_b UUID GENERATED ALWAYS AS (GREATEST(user_a_id, user_b_id)) STORED,

    avatar_url TEXT,

    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT conversations_not_self CHECK (user_a_id <> user_b_id),

    CONSTRAINT conversations_pair_unique UNIQUE (conv_a, conv_b)
);

CREATE INDEX idx_conversations_conv_a ON conversations (conv_a);
CREATE INDEX idx_conversations_conv_b ON conversations (conv_b);
CREATE INDEX idx_conversations_updated_at_desc ON conversations (updated_at DESC);


CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text'
        CHECK (message_type IN ('text', 'image', 'file')),

    reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,

    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    edited_at TIMESTAMPTZ,

    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    pinned_at TIMESTAMPTZ,
    pinned_by UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_messages_conversation_created_desc
    ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender_created_desc
    ON messages (sender_id, created_at DESC);
CREATE INDEX idx_messages_reply_to ON messages (reply_to);

-- Sender must be one of the two participants in the conversation:
CREATE OR REPLACE FUNCTION enforce_sender_is_participant()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = NEW.conversation_id
          AND (NEW.sender_id = c.user_a_id OR NEW.sender_id = c.user_b_id)
    ) THEN
        RAISE EXCEPTION 'Sender % is not a participant of conversation %',
            NEW.sender_id, NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sender_is_participant
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION enforce_sender_is_participant();

-- Update messages.updated_at on edit
CREATE OR REPLACE FUNCTION touch_row_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_touch_updated
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION touch_row_updated_at();

CREATE OR REPLACE FUNCTION bump_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conversation_bump_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION bump_conversation_on_new_message();


CREATE TABLE message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT message_reactions_unique UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX idx_message_reactions_message_id ON message_reactions (message_id);

-- Participant-only reactions:
CREATE OR REPLACE FUNCTION enforce_reactor_is_participant()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE m.id = NEW.message_id
          AND (NEW.user_id = c.user_a_id OR NEW.user_id = c.user_b_id)
    ) THEN
        RAISE EXCEPTION 'User % is not a participant for reaction on message %',
            NEW.user_id, NEW.message_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reactor_is_participant
  BEFORE INSERT OR UPDATE ON message_reactions
  FOR EACH ROW EXECUTE FUNCTION enforce_reactor_is_participant();

CREATE TABLE message_read_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT message_read_unique UNIQUE (message_id, user_id)
);
CREATE INDEX idx_mrs_user_id ON message_read_status (user_id);
CREATE INDEX idx_mrs_message_id ON message_read_status (message_id);

-- Participant-only reads:
CREATE OR REPLACE FUNCTION enforce_reader_is_participant()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE m.id = NEW.message_id
          AND (NEW.user_id = c.user_a_id OR NEW.user_id = c.user_b_id)
    ) THEN
        RAISE EXCEPTION 'User % is not a participant for read on message %',
            NEW.user_id, NEW.message_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reader_is_participant
  BEFORE INSERT OR UPDATE ON message_read_status
  FOR EACH ROW EXECUTE FUNCTION enforce_reader_is_participant();


CREATE TABLE user_presence (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'offline'
        CHECK (status IN ('online', 'away', 'offline')),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_presence_status ON user_presence (status);

CREATE TRIGGER trg_presence_touch_updated
  BEFORE UPDATE ON user_presence
  FOR EACH ROW EXECUTE FUNCTION touch_row_updated_at();


CREATE TABLE typing_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT typing_unique UNIQUE (conversation_id, user_id)
);
CREATE INDEX idx_typing_conversation_id ON typing_indicators (conversation_id);

-- Participant-only typing:
CREATE OR REPLACE FUNCTION enforce_typer_is_participant()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = NEW.conversation_id
          AND (NEW.user_id = c.user_a_id OR NEW.user_id = c.user_b_id)
    ) THEN
        RAISE EXCEPTION 'User % is not a participant for typing in conversation %',
            NEW.user_id, NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_typer_is_participant
  BEFORE INSERT OR UPDATE ON typing_indicators
  FOR EACH ROW EXECUTE FUNCTION enforce_typer_is_participant();

CREATE TABLE message_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT draft_unique UNIQUE (conversation_id, user_id)
);
CREATE INDEX idx_drafts_user_conversation ON message_drafts (user_id, conversation_id);

CREATE TRIGGER trg_drafts_touch_updated
  BEFORE UPDATE ON message_drafts
  FOR EACH ROW EXECUTE FUNCTION touch_row_updated_at();

CREATE OR REPLACE FUNCTION enforce_drafter_is_participant()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = NEW.conversation_id
          AND (NEW.user_id = c.user_a_id OR NEW.user_id = c.user_b_id)
    ) THEN
        RAISE EXCEPTION 'User % is not a participant for draft in conversation %',
            NEW.user_id, NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_drafter_is_participant
  BEFORE INSERT OR UPDATE ON message_drafts
  FOR EACH ROW EXECUTE FUNCTION enforce_drafter_is_participant();


CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_attachments_message_id ON message_attachments (message_id);


CREATE OR REPLACE FUNCTION touch_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conversations_touch_updated
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION touch_conversation_updated_at();

-- Index for fast message queries (removed WHERE clause to avoid IMMUTABLE requirement)
CREATE INDEX idx_messages_recent_by_conversation
  ON messages (conversation_id, created_at DESC);