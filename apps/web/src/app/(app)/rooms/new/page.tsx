import { RoomForm } from "../room-form";

export default function NewRoomPage() {
  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Create New Room</h2>
      <RoomForm mode="create" />
    </div>
  );
}
