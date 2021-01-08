We have a strong remote machine you can use for fast compilation and execution of tests.
To use it:

1. Make sure your local machine has an [OpenSSH client](https://docs.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse)
2. Install the remote ssh extension in your vs code.
3. Generate an rsa private-public key pair e.g. using `ssh-keygen` and send the public key - let's assume here it's called `id_rsa.pub` to Charlie.
4. Send your prefered username to Charlie - let's assume here it's `ariel`.
5. Create a file called `config`, that looks like this (with your username):
        Host server01
         HostName mainframe.aztecprotocol.com
         User ariel
         Port 22
6. Place `config` and `id_rsa.pub` in a directory of your choice - e.g. `C:\Users\hp\.ssh`
7. Press F1 in vscode and choose the `Remote-SSH:Connect to Host..` command.
8. Choose `Configure SSH hosts` and then `Settings`. 
9. Write down the full path of the `config` file - e.g. `C:\Users\hp\.ssh\config`.
10. Open the remote ssh extension using the terminal icon. You should see `server01` under SSH TARGETS. Right click and choose connect.
11. If asked for machine type choose Linux.
12. If you wish to work with the machine through a terminal outside of vscode use `ssh username@mainframe.aztecprotocol.com -A` 