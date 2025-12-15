import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useConnectionStore } from '@/stores/connectionStore'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const GROUP_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
]

const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(50, 'Name too long'),
  color: z.string(),
})

type GroupFormData = z.infer<typeof groupSchema>

interface CreateGroupDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateGroupDialog({ isOpen, onClose }: CreateGroupDialogProps) {
  const createGroup = useConnectionStore((s) => s.createGroup)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      color: GROUP_COLORS[0],
    },
    mode: 'onChange',
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedColor = watch('color')

  const onSubmit = (data: GroupFormData) => {
    createGroup(data.name.trim(), data.color)
    reset()
    onClose()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Connection Group</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Group Name</label>
              <Input {...register('name')} placeholder='Production, Development, Staging...' autoFocus />
              {errors.name && <p className='text-xs text-destructive'>{errors.name.message}</p>}
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Color</label>
              <div className='flex gap-2'>
                {GROUP_COLORS.map((c) => (
                  <button
                    key={c}
                    type='button'
                    className={`w-7 h-7 rounded-full transition-all ${
                      selectedColor === c
                        ? 'ring-2 ring-ring ring-offset-2 ring-offset-background scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setValue('color', c)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type='button' variant='ghost' onClick={handleClose}>
              Cancel
            </Button>
            <Button type='submit' disabled={!isValid}>
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
