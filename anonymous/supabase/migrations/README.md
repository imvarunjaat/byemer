# Supabase Schema Migration for User-Specific Room Data

## Overview

This migration moves user-specific room and chat data from local device storage to Supabase database storage. This enables:

1. **Cross-device access**: Users can now access their rooms and chats from any device after logging in
2. **Better data persistence**: No more losing chat history when clearing app data
3. **Enhanced security**: Row-Level Security (RLS) ensures users only see their own data
4. **Improved features**: Added support for pinned rooms, custom room names, and more metadata

## Schema Changes

### New Tables

- **user_recent_rooms**: Tracks which rooms a user has recently accessed
  - Links user_id to room_id with additional metadata like:
    - last_accessed timestamp
    - emoji for the room
    - nickname used in the room
    - custom_name (so users can rename rooms for their personal view)
    - is_pinned flag

### Modified Tables

- **messages**: Added nickname column to store the sender's nickname with each message
- **room_participants**: Added nickname and custom_avatar columns for enhanced user experience

### New Database View

- **user_rooms_view**: Joins user_recent_rooms with rooms to provide a complete view of a user's rooms

## Code Changes

The application code has been updated to:

1. Store recently accessed rooms in Supabase instead of AsyncStorage
2. Load rooms for the current authenticated user only
3. Include nicknames with messages in Supabase
4. Track user preferences for rooms

## Migration Process

For existing users, this is a forward-only change. Previously stored local room data will not automatically migrate to the server. As users re-join or create rooms after this update, their room data will begin to be stored in Supabase.

## Benefits

- **Better UX**: Users won't lose their rooms when switching devices
- **Real-time updates**: Changes sync across all user devices  
- **Future-proof**: Foundation for adding more user-specific features like room favorites, custom themes, etc.
