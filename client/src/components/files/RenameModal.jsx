import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { updateDocument } from '../../services/files.service.js';
import { apiErrorMessage } from '../../lib/axios.js';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';

export default function RenameModal({ open, onClose, doc, onDone }) {
  const [name, setName] = useState(doc.name);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setName(doc.name);
  }, [open, doc.name]);

  const save = async () => {
    if (!name.trim()) return toast.error('Name cannot be empty');
    setLoading(true);
    try {
      await updateDocument(doc._id, { name: name.trim() });
      toast.success('Renamed');
      onDone?.();
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Rename file" size="sm">
      <div className="space-y-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          autoFocus
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={save} loading={loading} className="flex-1">
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
