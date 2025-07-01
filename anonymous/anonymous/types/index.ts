export type Room = {
  id: string;
  name: string;
  created_at: string;
};

export type Participant = {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
};

export type Message = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
};
