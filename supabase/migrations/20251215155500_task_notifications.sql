-- Migration: Add Task Notifications Trigger

-- 1. Create Function to handle task changes
CREATE OR REPLACE FUNCTION public.handle_task_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_board_id UUID;
    v_message TEXT;
    v_task_title TEXT;
    v_task_id UUID;
    v_actor_id UUID;
BEGIN
    -- Get current user (actor)
    v_actor_id := auth.uid();
    
    -- Determine operation type and set variables
    IF (TG_OP = 'DELETE') THEN
        v_task_id := OLD.id;
        v_task_title := OLD.title;
        SELECT board_id INTO v_board_id FROM public.columns WHERE id = OLD.column_id;
        v_message := 'Task deleted: ' || v_task_title;
    ELSE
        v_task_id := NEW.id;
        v_task_title := NEW.title;
        SELECT board_id INTO v_board_id FROM public.columns WHERE id = NEW.column_id;
        
        IF (TG_OP = 'INSERT') THEN
            v_message := 'New task created: ' || v_task_title;
        ELSIF (TG_OP = 'UPDATE') THEN
            IF (OLD.column_id IS DISTINCT FROM NEW.column_id) THEN
                v_message := 'Task moved: ' || v_task_title;
            ELSIF (OLD.title IS DISTINCT FROM NEW.title) THEN
                 v_message := 'Task renamed: ' || OLD.title || ' -> ' || NEW.title;
            ELSE
                 -- Skip other updates for now to reduce noise (e.g. description, position changes w/o column change)
                 RETURN NEW; 
            END IF;
        END IF;
    END IF;

    -- Insert notifications for all board members EXCEPT the actor
    INSERT INTO public.notifications (user_id, task_id, type, message)
    SELECT bm.user_id, v_task_id, 'task_update', v_message
    FROM public.board_members bm
    WHERE bm.board_id = v_board_id
    AND bm.user_id != v_actor_id;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS on_task_notification ON public.tasks;

CREATE TRIGGER on_task_notification
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_task_notification();
