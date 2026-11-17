from fabric.api import *
from fabric.contrib.project import rsync_project
import json

metadata = json.loads(open("package.json", "r").read())

try:
    hosts = json.loads(open(".hosts.json", "r").read())
except IOError:
    print "Specify hosts to deploy to in .hosts.json first."
    exit()

env.use_ssh_config = True
env.hosts = hosts

doc_dir = "public/doc"
version = metadata["version"]

@parallel
def deploy_site():
    target = doc_dir + "/dev/"
    rsync_project(remote_dir=target, local_dir="build_docs/")

@parallel
def release_site():
    deploy_site()
    with cd(doc_dir):
        run("cp -R dev v%s" % version)

@parallel
def unrelease_site():
    with cd(doc_dir):
        run("rm -rf v%s" % version)

@runs_once
def release_github():
    local("git tag v%s" % version)
    local("git push all v%s" % version)

@runs_once
def release_npm():
    local("npm publish")

@runs_once
def clean():
    local("git clean -fd")

def release():
    clean()
    release_site()
    release_github()
    release_npm()
