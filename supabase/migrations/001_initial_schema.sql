-- MAAC Student Attendance Portal - Database Schema
-- Run this script in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

-- User roles
CREATE TYPE user_role AS ENUM ('ADMIN', 'CENTRE_MANAGER', 'FACULTY');

-- Batch schedule days
CREATE TYPE batch_days AS ENUM ('MWF', 'TTS');

-- Attendance status
CREATE TYPE attendance_status AS ENUM ('Present', 'Absent');

-- ============================================
-- TABLES
-- ============================================

-- Centers table
CREATE TABLE centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'FACULTY',
    center_id UUID REFERENCES centers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batches table
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    days batch_days NOT NULL,
    timing VARCHAR(100) NOT NULL,
    faculty_id UUID REFERENCES users(id) ON DELETE SET NULL,
    center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, center_id)
);

-- Students table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    roll_number VARCHAR(50) NOT NULL,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(roll_number, center_id)
);

-- Attendance table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status attendance_status NOT NULL DEFAULT 'Present',
    marked_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, batch_id, date)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_users_center ON users(center_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_batches_center ON batches(center_id);
CREATE INDEX idx_batches_faculty ON batches(faculty_id);
CREATE INDEX idx_batches_days ON batches(days);
CREATE INDEX idx_students_batch ON students(batch_id);
CREATE INDEX idx_students_center ON students(center_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_batch ON attendance(batch_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_marked_by ON attendance(marked_by_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Centers policies
CREATE POLICY "Centers are viewable by authenticated users"
    ON centers FOR SELECT
    TO authenticated
    USING (true);

-- Users policies
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Admins can view all users"
    ON users FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() AND u.role = 'ADMIN'
        )
    );

CREATE POLICY "Centre managers can view users in their center"
    ON users FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'CENTRE_MANAGER' 
            AND u.center_id = users.center_id
        )
    );

CREATE POLICY "Admins can insert users"
    ON users FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() AND u.role = 'ADMIN'
        )
    );

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Batches policies
CREATE POLICY "Batches viewable by center members"
    ON batches FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND (u.role = 'ADMIN' OR u.center_id = batches.center_id)
        )
    );

CREATE POLICY "Centre managers can create batches"
    ON batches FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('ADMIN', 'CENTRE_MANAGER') 
            AND (u.role = 'ADMIN' OR u.center_id = batches.center_id)
        )
    );

CREATE POLICY "Centre managers can update batches"
    ON batches FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('ADMIN', 'CENTRE_MANAGER') 
            AND (u.role = 'ADMIN' OR u.center_id = batches.center_id)
        )
    );

CREATE POLICY "Centre managers can delete batches"
    ON batches FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('ADMIN', 'CENTRE_MANAGER') 
            AND (u.role = 'ADMIN' OR u.center_id = batches.center_id)
        )
    );

-- Students policies
CREATE POLICY "Students viewable by center members"
    ON students FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND (u.role = 'ADMIN' OR u.center_id = students.center_id)
        )
    );

CREATE POLICY "Centre managers can create students"
    ON students FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('ADMIN', 'CENTRE_MANAGER') 
            AND (u.role = 'ADMIN' OR u.center_id = students.center_id)
        )
    );

CREATE POLICY "Centre managers can update students"
    ON students FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('ADMIN', 'CENTRE_MANAGER') 
            AND (u.role = 'ADMIN' OR u.center_id = students.center_id)
        )
    );

CREATE POLICY "Centre managers can delete students"
    ON students FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('ADMIN', 'CENTRE_MANAGER') 
            AND (u.role = 'ADMIN' OR u.center_id = students.center_id)
        )
    );

-- Attendance policies
CREATE POLICY "Attendance viewable by center members"
    ON attendance FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND (
                u.role = 'ADMIN' 
                OR EXISTS (
                    SELECT 1 FROM students s 
                    WHERE s.id = attendance.student_id 
                    AND s.center_id = u.center_id
                )
            )
        )
    );

CREATE POLICY "Faculty can mark attendance for their batches"
    ON attendance FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            JOIN batches b ON b.faculty_id = u.id
            WHERE u.id = auth.uid() 
            AND b.id = attendance.batch_id
        )
        OR
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('ADMIN', 'CENTRE_MANAGER')
        )
    );

CREATE POLICY "Faculty can update their own attendance records"
    ON attendance FOR UPDATE
    TO authenticated
    USING (
        marked_by_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('ADMIN', 'CENTRE_MANAGER')
        )
    );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'FACULTY')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
DECLARE
    result user_role;
BEGIN
    SELECT role INTO result FROM public.users WHERE id = user_id;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get attendance summary for a batch
CREATE OR REPLACE FUNCTION public.get_batch_attendance_summary(
    p_batch_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    student_id UUID,
    student_name VARCHAR,
    roll_number VARCHAR,
    total_classes BIGINT,
    present_count BIGINT,
    absent_count BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as student_id,
        s.name as student_name,
        s.roll_number,
        COUNT(a.id) as total_classes,
        COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_count,
        CASE 
            WHEN COUNT(a.id) > 0 THEN 
                ROUND((COUNT(CASE WHEN a.status = 'Present' THEN 1 END)::NUMERIC / COUNT(a.id)::NUMERIC) * 100, 2)
            ELSE 0
        END as percentage
    FROM students s
    LEFT JOIN attendance a ON s.id = a.student_id
        AND (p_start_date IS NULL OR a.date >= p_start_date)
        AND (p_end_date IS NULL OR a.date <= p_end_date)
    WHERE s.batch_id = p_batch_id
    GROUP BY s.id, s.name, s.roll_number
    ORDER BY s.roll_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA
-- ============================================

-- Insert Greater Noida center
INSERT INTO centers (name) VALUES ('Greater Noida')
ON CONFLICT (name) DO NOTHING;

-- Note: After running this script, you'll need to:
-- 1. Create users through Supabase Auth (email/password signup)
-- 2. Update user roles in the users table as needed
-- 3. The first user should be manually set as ADMIN:
--    UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';

